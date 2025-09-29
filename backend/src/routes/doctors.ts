import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection'; // Import the database connection

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ===========================
// DOCTOR ROUTES
// ===========================

// GET /api/doctors - Get all active doctors with their section and specialties
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const query = `
      SELECT 
        d.*, 
        s.name as section_name,
        (
          SELECT COALESCE(JSON_AGG(spec.*), '[]') 
          FROM sgh_doctor_specialties ds
          JOIN sgh_specialties spec ON ds.specialty_id = spec.id
          WHERE ds.doctor_id = d.id
        ) as specialties
      FROM sgh_doctors d
      LEFT JOIN sgh_sections s ON d.section_id = s.id
      WHERE d.is_active = TRUE 
      ORDER BY d.name;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Error fetching doctors' });
  }
});

// GET /api/doctors/section/:sectionId - Get active doctors by section
router.get('/section/:sectionId', [
  param('sectionId').notEmpty().withMessage('Section ID is required'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { sectionId } = req.params;
    const query = `
      SELECT 
        d.*, 
        s.name as section_name,
        (
          SELECT COALESCE(JSON_AGG(spec.*), '[]') 
          FROM sgh_doctor_specialties ds
          JOIN sgh_specialties spec ON ds.specialty_id = spec.id
          WHERE ds.doctor_id = d.id
        ) as specialties
      FROM sgh_doctors d
      LEFT JOIN sgh_sections s ON d.section_id = s.id
      WHERE d.is_active = TRUE AND d.section_id = $1
      ORDER BY d.name;
    `;
    const result = await pool.query(query, [sectionId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching doctors by section:', error);
    res.status(500).json({ success: false, message: 'Error fetching doctors for the section' });
  }
});

// POST /api/doctors - Create a new doctor
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('license').notEmpty().withMessage('License is required'),
  body('section_id').isInt().withMessage('section_id must be an integer'),
  body('specialty_ids').optional().isArray().withMessage('specialty_ids must be an array'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  const client = await pool.connect();
  try {
    const { name, email, phone, license, avatar_url, section_id, user_id, specialty_ids } = req.body;

    await client.query('BEGIN');

    const doctorResult = await client.query(
      `INSERT INTO sgh_doctors (name, email, phone, license, avatar_url, section_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, phone, license, avatar_url, section_id, user_id]
    );
    const newDoctor = doctorResult.rows[0];

    if (specialty_ids && specialty_ids.length > 0) {
      const specialtyValues = specialty_ids.map((specialtyId: number) => `(${newDoctor.id}, ${specialtyId})`).join(',');
      await client.query(`INSERT INTO sgh_doctor_specialties (doctor_id, specialty_id) VALUES ${specialtyValues}`);
    }

    await client.query('COMMIT');

    // Refetch the full doctor data to return
    const finalResult = await client.query(
      `SELECT d.*, s.name as section_name, (
        SELECT COALESCE(JSON_AGG(spec.*), '[]') 
        FROM sgh_doctor_specialties ds JOIN sgh_specialties spec ON ds.specialty_id = spec.id 
        WHERE ds.doctor_id = d.id
      ) as specialties 
      FROM sgh_doctors d LEFT JOIN sgh_sections s ON d.section_id = s.id 
      WHERE d.id = $1`,
      [newDoctor.id]
    );

    res.status(201).json({ success: true, data: finalResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating doctor:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '23505') { // unique_violation
        return res.status(400).json({ success: false, message: 'A doctor with this email or license already exists.' });
    }
    res.status(500).json({ success: false, message: 'Error creating doctor' });
  } finally {
    client.release();
  }
});

// PUT /api/doctors/:id - Update a doctor
router.put('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  body('name').optional().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('A valid email is required'),
  body('section_id').optional().isInt().withMessage('section_id must be an integer'),
  body('specialty_ids').optional().isArray().withMessage('specialty_ids must be an array'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  const client = await pool.connect();
  const { id } = req.params;

  try {
    await client.query('BEGIN');

    // Update doctor's main details
    const { name, email, phone, license, avatar_url, section_id, is_active, user_id, specialty_ids } = req.body;
    const doctorResult = await client.query(
      `UPDATE sgh_doctors SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        license = COALESCE($4, license),
        avatar_url = COALESCE($5, avatar_url),
        section_id = COALESCE($6, section_id),
        is_active = COALESCE($7, is_active),
        user_id = COALESCE($8, user_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *`,
      [name, email, phone, license, avatar_url, section_id, is_active, user_id, id]
    );

    if (doctorResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Update specialties if provided
    if (specialty_ids) {
      await client.query('DELETE FROM sgh_doctor_specialties WHERE doctor_id = $1', [id]);
      if (specialty_ids.length > 0) {
        const specialtyValues = specialty_ids.map((specialtyId: number) => `(${id}, ${specialtyId})`).join(',');
        await client.query(`INSERT INTO sgh_doctor_specialties (doctor_id, specialty_id) VALUES ${specialtyValues}`);
      }
    }

    await client.query('COMMIT');

    // Refetch the full doctor data to return
    const finalResult = await client.query(
      `SELECT d.*, s.name as section_name, (
        SELECT COALESCE(JSON_AGG(spec.*), '[]') 
        FROM sgh_doctor_specialties ds JOIN sgh_specialties spec ON ds.specialty_id = spec.id 
        WHERE ds.doctor_id = d.id
      ) as specialties 
      FROM sgh_doctors d LEFT JOIN sgh_sections s ON d.section_id = s.id 
      WHERE d.id = $1`,
      [id]
    );

    res.json({ success: true, data: finalResult.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating doctor:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '23505') { // unique_violation
        return res.status(400).json({ success: false, message: 'A doctor with this email or license already exists.' });
    }
    res.status(500).json({ success: false, message: 'Error updating doctor' });
  } finally {
    client.release();
  }
});

// PUT /api/doctors/:id/deactivate - Deactivate a doctor
router.put('/:id/deactivate', [
  param('id').isInt().withMessage('ID must be an integer'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE sgh_doctors SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, message: 'Doctor deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating doctor:', error);
    res.status(500).json({ success: false, message: 'Error deactivating doctor' });
  }
});

// PUT /api/doctors/:id/reactivate - Reactivate a doctor
router.put('/:id/reactivate', [
  param('id').isInt().withMessage('ID must be an integer'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE sgh_doctors SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, message: 'Doctor reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating doctor:', error);
    res.status(500).json({ success: false, message: 'Error reactivating doctor' });
  }
});

export default router;
