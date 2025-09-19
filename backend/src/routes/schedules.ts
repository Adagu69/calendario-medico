import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ===========================
// RUTAS DE HORARIOS
// ===========================

// GET /api/schedules/doctor/:doctorId/:month - Obtener horario de un doctor para un mes específico
router.get('/doctor/:doctor_id/:month', [
  param('doctor_id').notEmpty().withMessage('ID de doctor requerido'),
  param('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato de mes inválido (YYYY-MM)'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, month } = req.params;
    const [year, monthNum] = month.split('-').map(Number);

    // Verify doctor exists
    const doctorCheck = await pool.query('SELECT id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }

    // Fetch month schedule
    const monthResult = await pool.query(
      'SELECT * FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    if (monthResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }

    const scheduleMonth = monthResult.rows[0];

    // Fetch time slots for the month
    const timeSlotsResult = await pool.query('SELECT * FROM sgh_time_slots WHERE month_id = $1', [scheduleMonth.id]);
    const timeSlotsMap = new Map(timeSlotsResult.rows.map((ts: any) => [ts.id, ts]));

    // Fetch days with assigned slots
    const daysResult = await pool.query('SELECT * FROM sgh_month_days WHERE month_id = $1', [scheduleMonth.id]);

    const shifts = daysResult.rows.map((day: any) => ({
      date: `${year}-${String(monthNum).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`,
      time_slot_ids: day.time_slot_ids,
      notes: day.notes,
      slots_details: day.time_slot_ids.map((id: string) => timeSlotsMap.get(id)).filter(Boolean)
    }));

    res.json({ success: true, data: { ...scheduleMonth, shifts } });
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    res.status(500).json({ success: false, message: 'Error al obtener horario del doctor' });
  }
});

// GET /api/schedules/section/:sectionId/:month - Obtener horarios de toda una sección para un mes
router.get('/section/:section_id/:month', [
  param('section_id').notEmpty().withMessage('ID de sección requerido'),
  param('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato de mes inválido (YYYY-MM)'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { section_id, month } = req.params;
    const [year, monthNum] = month.split('-').map(Number);

    // Verify section exists
    const sectionCheck = await pool.query('SELECT id FROM sgh_sections WHERE id = $1', [section_id]);
    if (sectionCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Sección no encontrada' });
    }

    // Get doctors in the section
    const doctorsResult = await pool.query('SELECT id FROM sgh_doctors WHERE section_id = $1 AND is_active = TRUE', [section_id]);
    const doctorIds = doctorsResult.rows.map((d: any) => d.id);

    if (doctorIds.length === 0) {
      return res.json({ success: true, data: [] }); // No doctors in this section
    }

    // Fetch schedules for all doctors in the section
    const schedulesResult = await pool.query(
      'SELECT * FROM sgh_months WHERE doctor_id = ANY($1::int[]) AND year = $2 AND month = $3',
      [doctorIds, year, monthNum]
    );

    res.json({ success: true, data: schedulesResult.rows });
  } catch (error) {
    console.error('Error fetching section schedules:', error);
    res.status(500).json({ success: false, message: 'Error al obtener horarios de la sección' });
  }
});

// POST /api/schedules - Guardar/actualizar horario completo de un doctor
router.post('/', [
  body('doctor_id').notEmpty().withMessage('ID de doctor requerido'),
  body('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato de mes inválido (YYYY-MM)'),
  body('shifts').isArray().withMessage('Los turnos deben ser un array'),
  body('specialty_id').notEmpty().withMessage('ID de especialidad requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, month, shifts, is_approved, created_by, updated_by, specialty_id } = req.body;
    const [year, monthNum] = month.split('-').map(Number);

    // Verify doctor and specialty exist
    const doctorCheck = await pool.query('SELECT id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    const specialtyCheck = await pool.query('SELECT id FROM sgh_specialties WHERE id = $1', [specialty_id]);
    if (specialtyCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Especialidad no encontrada' });
    }

    // Check for existing month schedule
    let monthResult = await pool.query(
      'SELECT id, status FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    let monthId: string;
    let currentStatus: string;

    if (monthResult.rowCount > 0) {
      monthId = monthResult.rows[0].id;
      currentStatus = monthResult.rows[0].status;
      // If already published, prevent direct update via this route
      if (currentStatus === 'published') {
        return res.status(400).json({ success: false, message: 'No se puede modificar un horario ya publicado. Utilice la ruta de cambios de calendario.' });
      }
      // Update existing month entry
      await pool.query(
        'UPDATE sgh_months SET specialty_id = $1, is_approved = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [specialty_id, is_approved || false, updated_by || 'system', monthId]
      );
      // Clear existing time slots and days for this month
      await pool.query('DELETE FROM sgh_time_slots WHERE month_id = $1', [monthId]);
      await pool.query('DELETE FROM sgh_month_days WHERE month_id = $1', [monthId]);
    } else {
      // Create new month entry
      const newMonthResult = await pool.query(
        'INSERT INTO sgh_months (doctor_id, specialty_id, year, month, is_approved, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [doctor_id, specialty_id, year, monthNum, is_approved || false, created_by || 'system', updated_by || 'system']
      );
      monthId = newMonthResult.rows[0].id;
    }

    // Insert new time slots and days
    for (const shift of shifts) {
      // Insert time slot
      const timeSlotResult = await pool.query(
        'INSERT INTO sgh_time_slots (month_id, name, start_time, end_time, color) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [monthId, shift.name, shift.start_time, shift.end_time, shift.color]
      );
      const timeSlotId = timeSlotResult.rows[0].id;

      // Insert day entry
      const day = new Date(shift.date).getDate();
      await pool.query(
        'INSERT INTO sgh_month_days (month_id, day, time_slot_ids, notes) VALUES ($1, $2, ARRAY[$3]::int[], $4)',
        [monthId, day, timeSlotId, shift.notes || null]
      );
    }

    res.status(200).json({ success: true, message: 'Horario guardado exitosamente' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ success: false, message: 'Error al guardar horario' });
  }
});

// POST /api/schedules/calendar-changes - Guardar cambios específicos del calendario
router.post('/calendar-changes', [
  body('doctor_id').notEmpty().withMessage('ID de doctor requerido'),
  body('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato de mes inválido (YYYY-MM)'),
  body('changes').isArray().withMessage('Los cambios deben ser un array'), // Array of { date, time_slot_ids, notes }
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, month, changes, updated_by } = req.body;
    const [year, monthNum] = month.split('-').map(Number);

    // Verify doctor exists
    const doctorCheck = await pool.query('SELECT id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }

    // Fetch existing month schedule
    const monthResult = await pool.query(
      'SELECT id, status FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    if (monthResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado para aplicar cambios' });
    }

    const scheduleMonthId = monthResult.rows[0].id;
    const currentStatus = monthResult.rows[0].status;

    // Prevent changes if schedule is published (unless specific permission/flow)
    if (currentStatus === 'published') {
      return res.status(400).json({ success: false, message: 'No se pueden aplicar cambios a un horario ya publicado directamente.' });
    }

    // Apply changes to sgh_month_days
    for (const change of changes) {
      const day = new Date(change.date).getDate();
      if (change.time_slot_ids && change.time_slot_ids.length > 0) {
        // Update or insert day entry
        await pool.query(
          'INSERT INTO sgh_month_days (month_id, day, time_slot_ids, notes) VALUES ($1, $2, ARRAY[$3]::int[], $4) ON CONFLICT (month_id, day) DO UPDATE SET time_slot_ids = EXCLUDED.time_slot_ids, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP',
          [scheduleMonthId, day, change.time_slot_ids[0], change.notes || null] // Assuming single time_slot_id for now
        );
      } else {
        // If time_slot_ids is empty, delete the day entry
        await pool.query('DELETE FROM sgh_month_days WHERE month_id = $1 AND day = $2', [scheduleMonthId, day]);
      }
    }

    // Update sgh_months updated_by and updated_at
    await pool.query('UPDATE sgh_months SET updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [updated_by || 'system', scheduleMonthId]);

    res.status(200).json({ success: true, message: 'Cambios de calendario guardados exitosamente' });
  } catch (error) {
    console.error('Error saving calendar changes:', error);
    res.status(500).json({ success: false, message: 'Error al guardar cambios del calendario' });
  }
});

// PUT /api/schedules/:id/approve - Aprobar horarios (solo jefes de sección)
router.put('/:id/approve', [
  param('id').notEmpty().withMessage('ID de horario requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE sgh_months SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', ['published', id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Horario aprobado y publicado correctamente' });
  } catch (error) {
    console.error('Error approving schedule:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar horario' });
  }
});

// GET /api/schedules/pending - Obtener horarios pendientes de aprobación
router.get('/pending', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM sgh_months WHERE status = $1 ORDER BY created_at DESC', ['draft']);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching pending schedules:', error);
    res.status(500).json({ success: false, message: 'Error al obtener horarios pendientes' });
  }
});

// GET /api/schedules/pending/section/:sectionId - Obtener horarios pendientes por sección
router.get('/pending/section/:section_id', [
  param('section_id').notEmpty().withMessage('ID de sección requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { section_id } = req.params;

    // Get doctors in the section
    const doctorsResult = await pool.query('SELECT id FROM sgh_doctors WHERE section_id = $1 AND is_active = TRUE', [section_id]);
    const doctorIds = doctorsResult.rows.map((d: any) => d.id);

    if (doctorIds.length === 0) {
      return res.json({ success: true, data: [] }); // No doctors in this section
    }

    // Fetch pending schedules for doctors in the section
    const schedulesResult = await pool.query(
      'SELECT * FROM sgh_months WHERE doctor_id = ANY($1::int[]) AND status = $2 ORDER BY created_at DESC',
      [doctorIds, 'draft']
    );

    res.json({ success: true, data: schedulesResult.rows });
  } catch (error) {
    console.error('Error fetching pending section schedules:', error);
    res.status(500).json({ success: false, message: 'Error al obtener horarios pendientes de la sección' });
  }
});

// Auxiliary function to calculate total hours
function calculateTotalHours(shifts: any[]): number {
  let totalHours = 0;
  
  shifts.forEach((shift: any) => {
    if (shift.start_time && shift.end_time) {
      const start = new Date(`2000-01-01T${shift.start_time}:00`);
      const end = new Date(`2000-01-01T${shift.end_time}:00`);
      const diffInMs = end.getTime() - start.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      
      if (diffInHours > 0) {
        totalHours += diffInHours;
      }
    }
  });
  
  return totalHours;
}

export default router;