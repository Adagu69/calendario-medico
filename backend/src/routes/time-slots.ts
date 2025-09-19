import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection';
import { verifyToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { checkPermissions } from '../middleware/permissions';
import type { 
  SGHTimeSlot, 
  CreateTimeSlotRequest, 
  UpdateTimeSlotRequest,
  ApiResponse,
  TimeSlotValidation,
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

// Validar formato de tiempo (HH:MM)
const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Validar que no haya solapamientos de tiempo
const validateTimeSlotOverlaps = async (
  month_id: number, 
  start_time: string, 
  end_time: string, 
  exclude_id?: number
): Promise<TimeSlotValidation> => {
  const client = await pool.connect();
  try {
    const existingSlotsResult = await client.query(
      'SELECT * FROM sgh_time_slots WHERE month_id = $1' + (exclude_id ? ' AND id != $2' : ''),
      exclude_id ? [month_id, exclude_id] : [month_id]
    );
    const existingSlots: SGHTimeSlot[] = existingSlotsResult.rows;
    
    const errors: string[] = [];
    const overlaps: SGHTimeSlot[] = [];
    
    // Validar que start < end
    if (start_time >= end_time) {
      errors.push('La hora de inicio debe ser menor que la hora de fin');
    }
    
    // Verificar solapamientos
    for (const slot of existingSlots) {
      const existingStart = slot.start_time;
      const existingEnd = slot.end_time;
      
      // Verificar si hay solapamiento
      if (
        (start_time >= existingStart && start_time < existingEnd) ||
        (end_time > existingStart && end_time <= existingEnd) ||
        (start_time <= existingStart && end_time >= existingEnd)
      ) {
        overlaps.push(slot);
        errors.push(`Solapamiento con el horario "${slot.name}" (${slot.start_time}-${slot.end_time})`);
      }
    }
    
    return {
      is_valid: errors.length === 0,
      errors,
      overlaps
    };
  } finally {
    client.release();
  }
};

// ===========================
// ENDPOINTS DE TIME SLOTS
// ===========================

// GET /api/time-slots/month/:month_id - Obtener todos los slots de un mes
router.get('/month/:month_id', verifyToken, [
  param('month_id').isInt().withMessage('month_id debe ser un número'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const month_id = parseInt(req.params.month_id);
    const currentUser = req.user as SGHUser;
    
    // Verify user has access to this month
    const monthCheck = await pool.query('SELECT id FROM sgh_months WHERE id = $1', [month_id]);
    if (monthCheck.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Mes no encontrado' });
    }
    // TODO: Add proper permission check (e.g., checkPermissions(currentUser, 'view_month', { monthId }))

    const result = await pool.query('SELECT * FROM sgh_time_slots WHERE month_id = $1 ORDER BY start_time', [month_id]);
    
    const response: ApiResponse<SGHTimeSlot[]> = {
      success: true,
      data: result.rows,
      message: 'Horarios obtenidos exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/time-slots - Crear nuevo slot
router.post('/', verifyToken, [
  body('month_id').isInt().withMessage('month_id es requerido y debe ser un número'),
  body('name').isLength({ min: 1, max: 255 }).withMessage('name es requerido (1-255 caracteres)'),
  body('start_time').custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('start_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('end_time').custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('end_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('color').matches(/^#[0-9A-Fa-f]{6}$/).withMessage('color debe ser un código hexadecimal válido (#RRGGBB)'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const { month_id, name, start_time, end_time, color }: CreateTimeSlotRequest = req.body;
    const currentUser = req.user as SGHUser;
    
    // Verify permissions to edit the month
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { month_id });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este mes'
      });
    }
    
    // Validate overlaps
    const validation = await validateTimeSlotOverlaps(month_id, start_time, end_time);
    if (!validation.is_valid) {
      return res.status(400).json({
        success: false,
        error: 'Conflictos de horario detectados',
        errors: validation.errors
      });
    }
    
    const result = await pool.query(
      'INSERT INTO sgh_time_slots (month_id, name, start_time, end_time, color) VALUES ($1, $2, $3, $4, $5) RETURNING *'
      , [month_id, name, start_time, end_time, color]
    );
    const newTimeSlot: SGHTimeSlot = result.rows[0];
    
    const response: ApiResponse<SGHTimeSlot> = {
      success: true,
      data: newTimeSlot,
      message: 'Horario creado exitosamente'
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creando horario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /api/time-slots/:id - Actualizar slot
router.put('/:id', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('name').optional().isLength({ min: 1, max: 255 }).withMessage('name debe tener 1-255 caracteres'),
  body('start_time').optional().custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('start_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('end_time').optional().custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('end_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('color debe ser un código hexadecimal válido'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const slot_id = parseInt(req.params.id);
    const updates: UpdateTimeSlotRequest = req.body;
    const currentUser = req.user as SGHUser;
    
    const existingSlotResult = await pool.query('SELECT * FROM sgh_time_slots WHERE id = $1', [slot_id]);
    const existingSlot: SGHTimeSlot | null = existingSlotResult.rows[0] || null;
    
    if (!existingSlot) {
      return res.status(404).json({
        success: false,
        error: 'Horario no encontrado'
      });
    }
    
    // Verify permissions
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { month_id: existingSlot.month_id });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este horario'
      });
    }
    
    // If times are being updated, validate overlaps
    const new_start_time = updates.start_time || existingSlot.start_time;
    const new_end_time = updates.end_time || existingSlot.end_time;
    
    if (updates.start_time || updates.end_time) {
      const validation = await validateTimeSlotOverlaps(
        existingSlot.month_id, 
        new_start_time, 
        new_end_time, 
        slot_id
      );
      
      if (!validation.is_valid) {
        return res.status(400).json({
          success: false,
          error: 'Conflictos de horario detectados',
          errors: validation.errors
        });
      }
    }
    
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.start_time !== undefined) {
      fields.push(`start_time = $${paramIndex++}`);
      values.push(updates.start_time);
    }
    if (updates.end_time !== undefined) {
      fields.push(`end_time = $${paramIndex++}`);
      values.push(updates.end_time);
    }
    if (updates.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No se proporcionaron datos para actualizar' });
    }

    const queryText = `UPDATE sgh_time_slots SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    values.push(slot_id);

    const result = await pool.query(queryText, values);
    const updatedSlot: SGHTimeSlot = result.rows[0];
    
    const response: ApiResponse<SGHTimeSlot> = {
      success: true,
      data: updatedSlot,
      message: 'Horario actualizado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error actualizando horario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// DELETE /api/time-slots/:id - Eliminar slot
router.delete('/:id', verifyToken, [
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors
], auditLog, async (req: express.Request, res: express.Response) => {
  try {
    const slot_id = parseInt(req.params.id);
    const currentUser = req.user as SGHUser;
    
    const existingSlotResult = await pool.query('SELECT * FROM sgh_time_slots WHERE id = $1', [slot_id]);
    const existingSlot: SGHTimeSlot | null = existingSlotResult.rows[0] || null;
    
    if (!existingSlot) {
      return res.status(404).json({
        success: false,
        error: 'Horario no encontrado'
      });
    }
    
    // Verify permissions
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { month_id: existingSlot.month_id });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este horario'
      });
    }
    
    // Check if this time slot is used in any sgh_month_days
    const usageCheck = await pool.query('SELECT COUNT(*) FROM sgh_month_days WHERE $1 = ANY(time_slot_ids)', [slot_id]);
    if (usageCheck.rows[0].count > 0) {
      return res.status(400).json({ success: false, error: 'No se puede eliminar el horario porque está asignado a días.' });
    }

    await pool.query('DELETE FROM sgh_time_slots WHERE id = $1', [slot_id]);
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'Horario eliminado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error eliminando horario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/time-slots/validate - Validar horario sin crear
router.post('/validate', verifyToken, [
  body('month_id').isInt().withMessage('month_id es requerido'),
  body('start_time').custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('start_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('end_time').custom((value) => {
    if (!isValidTime(value)) {
      throw new Error('end_time debe tener formato HH:MM');
    }
    return true;
  }),
  body('exclude_id').optional().isInt().withMessage('exclude_id debe ser un número'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { month_id, start_time, end_time, exclude_id } = req.body;
    const currentUser = req.user as SGHUser;
    
    // Verify permissions
    const hasPermission = await checkPermissions(currentUser, 'view_month', { month_id });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este mes'
      });
    }
    
    const validation = await validateTimeSlotOverlaps(month_id, start_time, end_time, exclude_id);
    
    const response: ApiResponse<TimeSlotValidation> = {
      success: true,
      data: validation,
      message: validation.is_valid ? 'Horario válido' : 'Conflictos detectados'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error validando horario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

export default router;
