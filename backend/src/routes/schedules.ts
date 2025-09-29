import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection';

const router = express.Router();

const normalizeTimeSlotIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return (value as Array<string | number>)
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  }

  if (typeof value === 'string') {
    return value
      .replace(/[{}]/g, '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));
  }

  return [];
};

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
    if (!doctorCheck || doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }

    // Fetch month schedule
    const monthResult = await pool.query(
      'SELECT * FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    if (!monthResult || monthResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }

    const scheduleMonth = monthResult.rows[0];

    // Fetch time slots for the month
    const timeSlotsResult = await pool.query('SELECT * FROM sgh_time_slots WHERE month_id = $1', [scheduleMonth.id]);
    const timeSlots = timeSlotsResult.rows.map((ts: any) => ({
      ...ts,
      label: ts.name,
    }));
    const timeSlotsMap = new Map(timeSlots.map((ts: any) => [String(ts.id), ts]));

    // Fetch days with assigned slots
    const daysResult = await pool.query('SELECT * FROM sgh_month_days WHERE month_id = $1', [scheduleMonth.id]);

    const shifts = daysResult.rows.map((day: any) => {
      const normalizedIds = normalizeTimeSlotIds(day.time_slot_ids);

      return {
        date: `${year}-${String(monthNum).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`,
        time_slot_ids: normalizedIds,
        notes: day.notes,
        slots_details: normalizedIds
          .map((id: number) => timeSlotsMap.get(String(id)))
          .filter(Boolean),
      };
    });

    res.json({ success: true, data: { ...scheduleMonth, time_slots: timeSlots, shifts } });
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
    if (!sectionCheck || sectionCheck.rowCount === 0) {
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
  body('time_slots').isArray().withMessage('Los time_slots deben ser un array'),
  body('section_id').notEmpty().withMessage('ID de sección requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { doctor_id, month, time_slots, shifts, is_approved, created_by, updated_by, section_id } = req.body;
    const [year, monthNum] = month.split('-').map(Number);

    // Verify doctor and section exist
    const doctorCheck = await pool.query('SELECT id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (!doctorCheck || doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    const sectionCheck = await pool.query('SELECT id FROM sgh_sections WHERE id = $1', [section_id]);
    if (!sectionCheck || sectionCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Sección no encontrada' });
    }

    // Check for existing month schedule
    const monthResult = await pool.query(
      'SELECT id, status FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    let monthId: string;
    let currentStatus: string;

    const existingMonth = monthResult?.rowCount && monthResult.rowCount > 0 ? monthResult.rows[0] : null;

    if (existingMonth) {
      monthId = existingMonth.id;
      currentStatus = existingMonth.status;
      // If already published, prevent direct update via this route
      if (currentStatus === 'published') {
        return res.status(400).json({ success: false, message: 'No se puede modificar un horario ya publicado. Utilice la ruta de cambios de calendario.' });
      }
      // Update existing month entry
      await pool.query(
        'UPDATE sgh_months SET section_id = $1, is_approved = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [section_id, is_approved || false, updated_by || 1, monthId]
      );
      // Clear existing time slots and days for this month
      await pool.query('DELETE FROM sgh_time_slots WHERE month_id = $1', [monthId]);
      await pool.query('DELETE FROM sgh_month_days WHERE month_id = $1', [monthId]);
    } else {
      // Create new month entry
      const newMonthResult = await pool.query(
        'INSERT INTO sgh_months (doctor_id, section_id, year, month, is_approved, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [doctor_id, section_id, year, monthNum, is_approved || false, created_by || 1, updated_by || 1]
      );
      monthId = newMonthResult.rows[0].id;
    }

    const clientShiftIdToDbId = new Map<string, number>();

    for (const timeSlot of time_slots) {
      const timeSlotResult = await pool.query(
        'INSERT INTO sgh_time_slots (month_id, name, start_time, end_time, color) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [monthId, timeSlot.name, timeSlot.start_time, timeSlot.end_time, timeSlot.color]
      );
      clientShiftIdToDbId.set(timeSlot.id, timeSlotResult.rows[0].id);
    }

    for (const shift of shifts) {
        const day = new Date(shift.date).getDate();
        const dbTimeSlotIds = shift.time_slot_ids.map((client_id: string) => clientShiftIdToDbId.get(client_id)).filter(Boolean);

        if (dbTimeSlotIds.length > 0) {
            await pool.query(
                'INSERT INTO sgh_month_days (month_id, day, time_slot_ids, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (month_id, day) DO UPDATE SET time_slot_ids = EXCLUDED.time_slot_ids, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP',
                [monthId, day, dbTimeSlotIds, shift.notes || null]
            );
        }
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
    const doctorCheck = await pool.query('SELECT id, section_id FROM sgh_doctors WHERE id = $1', [doctor_id]);
    if (!doctorCheck || doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    const section_id = doctorCheck.rows[0].section_id;

    // Fetch existing month schedule
    let monthResult = await pool.query(
      'SELECT id, status FROM sgh_months WHERE doctor_id = $1 AND year = $2 AND month = $3',
      [doctor_id, year, monthNum]
    );

    let scheduleMonthId: string;

    if (!monthResult || monthResult.rowCount === 0) {
      // If schedule doesn't exist, create it
      const newMonthResult = await pool.query(
        'INSERT INTO sgh_months (doctor_id, section_id, year, month, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [doctor_id, section_id, year, monthNum, updated_by || 1, updated_by || 1]
      );
      scheduleMonthId = newMonthResult.rows[0].id;
    } else {
      scheduleMonthId = monthResult.rows[0].id;
      const currentStatus = monthResult.rows[0].status;

      // Prevent changes if schedule is published (unless specific permission/flow)
      if (currentStatus === 'published') {
        return res.status(400).json({ success: false, message: 'No se pueden aplicar cambios a un horario ya publicado directamente.' });
      }
    }

    // Apply changes to sgh_month_days
    for (const change of changes) {
      const day = new Date(change.date).getDate();
      if (change.time_slot_ids && change.time_slot_ids.length > 0) {
        // Update or insert day entry
        await pool.query(
          'INSERT INTO sgh_month_days (month_id, day, time_slot_ids, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (month_id, day) DO UPDATE SET time_slot_ids = EXCLUDED.time_slot_ids, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP',
          [scheduleMonthId, day, change.time_slot_ids, change.notes || null]
        );
      } else {
        // If time_slot_ids is empty, delete the day entry
        await pool.query('DELETE FROM sgh_month_days WHERE month_id = $1 AND day = $2', [scheduleMonthId, day]);
      }
    }

    // Update sgh_months updated_by and updated_at
    await pool.query('UPDATE sgh_months SET updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [updated_by || 1, scheduleMonthId]);

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

    if (!result || result.rowCount === 0) {
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
