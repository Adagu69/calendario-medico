import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection'; // Import the database connection
import type { ExtendedDoctor, MedicalSection } from '../types/medical'; // Use the correct types

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
// RUTAS DE DOCTORES
// ===========================

// GET /api/doctors - Obtener todos los doctores
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM sgh_doctors WHERE is_active = TRUE ORDER BY first_name, last_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Error al obtener doctores' });
  }
});

// GET /api/doctors/section/:sectionId - Obtener doctores por sección
router.get('/section/:sectionId', [
  param('sectionId').notEmpty().withMessage('ID de sección requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { sectionId } = req.params;
    const result = await pool.query('SELECT * FROM sgh_doctors WHERE section_id = $1 AND is_active = TRUE ORDER BY first_name, last_name', [sectionId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching doctors by section:', error);
    res.status(500).json({ success: false, message: 'Error al obtener doctores de la sección' });
  }
});

// POST /api/doctors - Crear nuevo doctor
router.post('/', [
  body('first_name').notEmpty().withMessage('El nombre es requerido'),
  body('last_name').notEmpty().withMessage('El apellido es requerido'),
  body('document_type').isIn(['DNI', 'CEX', 'PAS']).withMessage('Tipo de documento inválido'),
  body('document_number').notEmpty().withMessage('Número de documento requerido'),
  body('profession').notEmpty().withMessage('La profesión es requerida'),
  body('license_number').notEmpty().withMessage('Número de licencia requerido'),
  body('section_id').notEmpty().withMessage('ID de sección requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { first_name, last_name, document_type, document_number, profession, license_number, section_id, email, phone, photo, user_id, is_chief } = req.body;

    // Verify section exists
    const sectionCheck = await pool.query('SELECT id FROM sgh_sections WHERE id = $1', [section_id]);
    if (sectionCheck.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Sección no encontrada' });
    }

    // Verify no other doctor with the same document number
    const existingDoctorCheck = await pool.query(
      'SELECT id FROM sgh_doctors WHERE document_number = $1 AND document_type = $2',
      [document_number, document_type]
    );
    if (existingDoctorCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe un doctor con este documento' });
    }

    const full_name = `${first_name} ${last_name}`;
    const code = `DOC-${Date.now()}`;
    const join_date = new Date().toISOString();
    const is_active = true;

    const result = await pool.query(
      `INSERT INTO sgh_doctors (
        user_id, code, first_name, last_name, full_name, document_type, document_number, 
        profession, license_number, email, phone, photo, section_id, is_chief, is_active, join_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        user_id || null, code, first_name, last_name, full_name, document_type, document_number,
        profession, license_number, email || null, phone || null, photo || null, section_id, is_chief || false, is_active, join_date
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ success: false, message: 'Error al crear doctor' });
  }
});

// PUT /api/doctors/:id - Actualizar doctor
router.put('/:id', [
  param('id').notEmpty().withMessage('ID requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const doctorCheck = await pool.query('SELECT * FROM sgh_doctors WHERE id = $1', [id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }

    const currentDoctor = doctorCheck.rows[0];
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Handle full_name update if first_name or last_name are updated
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const newFirstName = updates.first_name !== undefined ? updates.first_name : currentDoctor.first_name;
      const newLastName = updates.last_name !== undefined ? updates.last_name : currentDoctor.last_name;
      updates.full_name = `${newFirstName} ${newLastName}`;
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.full_name);
    }

    for (const key of [
      'first_name', 'last_name', 'document_type', 'document_number', 
      'profession', 'license_number', 'email', 'phone', 'photo', 
      'section_id', 'is_chief', 'is_active', 'user_id'
    ]) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No se proporcionaron datos para actualizar' });
    }

    const query = `UPDATE sgh_doctors SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar doctor' });
  }
});

// PUT /api/doctors/:id/deactivate - Desactivar doctor
router.put('/:id/deactivate', [
  param('id').notEmpty().withMessage('ID requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE sgh_doctors SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    res.json({ success: true, message: 'Doctor desactivado correctamente' });
  } catch (error) {
    console.error('Error deactivating doctor:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar doctor' });
  }
});

// PUT /api/doctors/:id/reactivate - Reactivar doctor
router.put('/:id/reactivate', [
  param('id').notEmpty().withMessage('ID requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE sgh_doctors SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    res.json({ success: true, message: 'Doctor reactivado correctamente' });
  } catch (error) {
    console.error('Error reactivating doctor:', error);
    res.status(500).json({ success: false, message: 'Error al reactivar doctor' });
  }
});

// PUT /api/doctors/:id/transfer - Transferir doctor a otra sección
router.put('/:id/transfer', [
  param('id').notEmpty().withMessage('ID requerido'),
  body('section_id').notEmpty().withMessage('ID de sección destino requerido'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { section_id } = req.body;

    const doctorCheck = await pool.query('SELECT * FROM sgh_doctors WHERE id = $1', [id]);
    if (doctorCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }
    const currentDoctor = doctorCheck.rows[0];

    // Verify target section exists
    const targetSectionCheck = await pool.query('SELECT id, chief_doctor_id FROM sgh_sections WHERE id = $1', [section_id]);
    if (targetSectionCheck.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Sección destino no encontrada' });
    }
    const targetSection = targetSectionCheck.rows[0];

    // If current doctor was chief of their previous section, remove that role
    if (currentDoctor.is_chief) {
      // Check if this doctor was indeed the chief of their current section
      const previousSectionCheck = await pool.query('SELECT chief_doctor_id FROM sgh_sections WHERE id = $1', [currentDoctor.section_id]);
      if (previousSectionCheck.rowCount > 0 && previousSectionCheck.rows[0].chief_doctor_id === currentDoctor.id) {
        await pool.query('UPDATE sgh_sections SET chief_doctor_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [currentDoctor.section_id]);
      }
      // Also set doctor's is_chief to false if transferring out of chief role
      await pool.query('UPDATE sgh_doctors SET is_chief = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }

    // Update doctor's section_id
    const result = await pool.query('UPDATE sgh_doctors SET section_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [section_id, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error transferring doctor:', error);
    res.status(500).json({ success: false, message: 'Error al transferir doctor' });
  }
});

export default router;