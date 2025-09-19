import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import pool from '../database/connection';
import { verifyToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { checkPermissions } from '../middleware/permissions';
import type { 
  SGHMonth, 
  CreateMonthRequest, 
  UpdateMonthRequest,
  ApiResponse,
  SGHTimeSlot,
  SGHMonthDay,
  SGHUser
} from '../types/sgh-types';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Datos de entrada inválidos',
      errors: errors.array() 
    });
  }
  next();
};

// ===========================
// ENDPOINTS DE CALENDARIOS
// ===========================

// GET /api/calendar/months - Obtener meses filtrados
router.get('/months', verifyToken, [
  query('doctor_id').optional().isInt().withMessage('doctor_id debe ser un número'),
  query('specialty_id').optional().isInt().withMessage('specialty_id debe ser un número'),
  query('year').optional().isInt().withMessage('year debe ser un número'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month debe estar entre 1 y 12'),
  query('status').optional().isIn(['draft', 'published']).withMessage('status inválido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, specialty_id, year, month, status } = req.query;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    } // Assuming req.user is populated by verifyToken
    
    let queryText = 'SELECT * FROM sgh_months WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (doctor_id) {
      queryText += ` AND doctor_id = $${paramIndex++}`;
      queryParams.push(doctor_id);
    }
    if (specialty_id) {
      queryText += ` AND specialty_id = $${paramIndex++}`;
      queryParams.push(specialty_id);
    }
    if (year) {
      queryText += ` AND year = $${paramIndex++}`;
      queryParams.push(year);
    }
    if (month) {
      queryText += ` AND month = $${paramIndex++}`;
      queryParams.push(month);
    }
    if (status) {
      queryText += ` AND status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // TODO: Add permission checks based on currentUser role and section

    const result = await pool.query(queryText, queryParams);
    
    const response: ApiResponse<SGHMonth[]> = {
      success: true,
      data: result.rows,
      message: 'Meses obtenidos exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo meses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/calendar/months/:id - Obtener mes específico con datos completos
router.get('/months/:id', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const month_id = parseInt(req.params.id);
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    
    const monthResult = await pool.query('SELECT * FROM sgh_months WHERE id = $1', [month_id]);
    const month: SGHMonth | null = monthResult.rows[0] || null;
    
    if (!month) {
      return res.status(404).json({
        success: false,
        error: 'Mes no encontrado'
      });
    }
    
    // Fetch related time slots and days
    const timeSlotsResult = await pool.query('SELECT * FROM sgh_time_slots WHERE month_id = $1', [month.id]);
    const daysResult = await pool.query('SELECT * FROM sgh_month_days WHERE month_id = $1', [month.id]);

    // Combine into a single object
    const fullMonthData = {
      ...month,
      time_slots: timeSlotsResult.rows,
      days: daysResult.rows
    };

    // TODO: Verify permissions (view_month)
    const hasAccess = await checkPermissions(currentUser, 'view_month', fullMonthData);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este mes'
      });
    }
    
    const response: ApiResponse<SGHMonth> = {
      success: true,
      data: fullMonthData,
      message: 'Mes obtenido exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo mes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/calendar/months - Crear nuevo mes
router.post('/months', verifyToken, [
  body('doctor_id').isInt().withMessage('doctor_id es requerido y debe ser un número'),
  body('specialty_id').isInt().withMessage('specialty_id es requerido y debe ser un número'),
  body('year').isInt({ min: 2024, max: 2030 }).withMessage('year debe estar entre 2024 y 2030'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('month debe estar entre 1 y 12'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, specialty_id, year, month }: CreateMonthRequest = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    
    // Verify permissions
    const hasPermission = await checkPermissions(currentUser, 'create_month', { doctor_id, specialty_id });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para crear calendarios para este doctor/especialidad'
      });
    }
    
    // Verify doctor and specialty exist
    const doctorCheck = await pool.query('SELECT id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(400).json({ success: false, error: 'Doctor no encontrado' });
    }
    const specialtyCheck = await pool.query('SELECT id FROM sgh_specialties WHERE id = $1', [specialty_id]);
    if (specialtyCheck.rowCount === 0) {
      return res.status(400).json({ success: false, error: 'Especialidad no encontrada' });
    }

    // Verify month does not already exist
    const existingMonthCheck = await pool.query(
      'SELECT id FROM sgh_months WHERE doctor_id = $1 AND specialty_id = $2 AND year = $3 AND month = $4',
      [doctor_id, specialty_id, year, month]
    );
    if (existingMonthCheck.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un calendario para este doctor, especialidad, año y mes.' });
    }

    const newMonthResult = await pool.query(
      `INSERT INTO sgh_months (
        doctor_id, specialty_id, year, month, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [doctor_id, specialty_id, year, month, 'draft', currentUser.id]
    );
    
    const newMonth: SGHMonth = newMonthResult.rows[0];
    
    const response: ApiResponse<SGHMonth> = {
      success: true,
      data: newMonth,
      message: 'Mes creado exitosamente'
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creando mes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /api/calendar/months/:id - Actualizar mes
router.put('/months/:id', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('status').optional().isIn(['draft', 'published']).withMessage('status inválido'),
  body('theme_config').optional().isObject().withMessage('theme_config debe ser un objeto'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const month_id = parseInt(req.params.id);
    const updates: UpdateMonthRequest = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    
    const monthResult = await pool.query('SELECT * FROM sgh_months WHERE id = $1', [month_id]);
    const existingMonth: SGHMonth | null = monthResult.rows[0] || null;
    
    if (!existingMonth) {
      return res.status(404).json({
        success: false,
        error: 'Mes no encontrado'
      });
    }
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'edit_month', existingMonth);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este mes'
      });
    }
    
    // If publishing, verify special permissions
    if (updates.status === 'published') {
      const canPublish = await checkPermissions(currentUser, 'publish_month', existingMonth);
      if (!canPublish) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para publicar este mes'
        });
      }
    }
    
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.theme_config !== undefined) {
      fields.push(`theme_config = $${paramIndex++}`);
      values.push(updates.theme_config);
    }

    // Handle published_at and published_by if status changes to published
    if (updates.status === 'published' && existingMonth.status !== 'published') {
      fields.push(`published_at = CURRENT_TIMESTAMP`);
      fields.push(`published_by = $${paramIndex++}`);
      values.push(currentUser.id);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos para actualizar' });
    }

    const queryText = `UPDATE sgh_months SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    values.push(month_id);

    const updatedMonthResult = await pool.query(queryText, values);
    const updatedMonth: SGHMonth = updatedMonthResult.rows[0];
    
    const response: ApiResponse<SGHMonth> = {
      success: true,
      data: updatedMonth,
      message: 'Mes actualizado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error actualizando mes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// DELETE /api/calendar/months/:id - Eliminar mes (solo drafts)
router.delete('/months/:id', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const month_id = parseInt(req.params.id);
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    
    const monthResult = await pool.query('SELECT * FROM sgh_months WHERE id = $1', [month_id]);
    const existingMonth: SGHMonth | null = monthResult.rows[0] || null;
    
    if (!existingMonth) {
      return res.status(404).json({
        success: false,
        error: 'Mes no encontrado'
      });
    }
    
    if (existingMonth.status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'No se pueden eliminar meses publicados'
      });
    }
    
    // Verify permissions
    const hasPermission = await checkPermissions(currentUser, 'delete_month', existingMonth);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este mes'
      });
    }
    
    // Delete from database (CASCADE will delete time_slots and days)
    await pool.query('DELETE FROM sgh_months WHERE id = $1', [month_id]);
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'Mes eliminado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error eliminando mes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/calendar/months/:id/copy-previous - Copiar del mes anterior
router.post('/months/:id/copy-previous', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const month_id = parseInt(req.params.id);
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }
    
    // Get current month details
    const currentMonthResult = await pool.query('SELECT * FROM sgh_months WHERE id = $1', [month_id]);
    const currentMonth: SGHMonth | null = currentMonthResult.rows[0] || null;

    if (!currentMonth) {
      return res.status(404).json({ success: false, error: 'Mes actual no encontrado' });
    }

    // Find previous month for the same doctor/specialty
    let previousMonthYear = currentMonth.year;
    let previousMonthNum = currentMonth.month - 1;
    if (previousMonthNum === 0) {
      previousMonthNum = 12;
      previousMonthYear--;
    }

    const previousMonthResult = await pool.query(
      'SELECT * FROM sgh_months WHERE doctor_id = $1 AND specialty_id = $2 AND year = $3 AND month = $4',
      [currentMonth.doctor_id, currentMonth.specialty_id, previousMonthYear, previousMonthNum]
    );
    const previousMonth: SGHMonth | null = previousMonthResult.rows[0] || null;

    if (!previousMonth) {
      return res.status(404).json({ success: false, error: 'Mes anterior no encontrado para copiar' });
    }

    // Copy time slots and days from previous month
    const previousTimeSlotsResult = await pool.query('SELECT * FROM sgh_time_slots WHERE month_id = $1', [previousMonth.id]);
    const previousDaysResult = await pool.query('SELECT * FROM sgh_month_days WHERE month_id = $1', [previousMonth.id]);

    // Insert copied time slots for the current month
    for (const ts of previousTimeSlotsResult.rows) {
      await pool.query(
        'INSERT INTO sgh_time_slots (month_id, name, start_time, end_time, color) VALUES ($1, $2, $3, $4, $5)',
        [currentMonth.id, ts.name, ts.start_time, ts.end_time, ts.color]
      );
    }

    // Insert copied days for the current month
    for (const day of previousDaysResult.rows) {
      await pool.query(
        'INSERT INTO sgh_month_days (month_id, day, time_slot_ids, notes) VALUES ($1, $2, $3, $4)',
        [currentMonth.id, day.day, day.time_slot_ids, day.notes]
      );
    }

    // Update theme_config if present in previous month
    if (previousMonth.theme_config) {
      await pool.query('UPDATE sgh_months SET theme_config = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [previousMonth.theme_config, currentMonth.id]);
    }
    
    const response: ApiResponse<SGHMonth> = {
      success: true,
      data: currentMonth,
      message: 'Datos copiados del mes anterior exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error copiando mes anterior:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

export default router;
