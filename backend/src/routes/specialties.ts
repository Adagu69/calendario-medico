import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../database/connection';

const router = express.Router();

const handleValidationErrors = (req: Request, res: Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// GET /api/specialties - Get all active specialties
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sgh_specialties WHERE is_active = TRUE ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ success: false, message: 'Error fetching specialties' });
  }
});

// POST /api/specialties - Create a new specialty
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO sgh_specialties (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Especialidad creada con éxito' });
  } catch (error) {
    console.error('Error creating specialty:', error);
    res.status(500).json({ success: false, message: 'Error creating specialty' });
  }
});

// PUT /api/specialties/:id - Update a specialty
router.put('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  body('name').notEmpty().withMessage('Name is required'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE sgh_specialties SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description || null, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Specialty not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Especialidad actualizada con éxito' });
  } catch (error) {
    console.error('Error updating specialty:', error);
    res.status(500).json({ success: false, message: 'Error updating specialty' });
  }
});

// DELETE /api/specialties/:id - Deactivate a specialty (soft delete)
router.delete('/:id', [
  param('id').isInt().withMessage('ID must be an integer'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE sgh_specialties SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Specialty not found' });
    }
    res.json({ success: true, message: 'Especialidad desactivada con éxito' });
  } catch (error) {
    console.error('Error deactivating specialty:', error);
    res.status(500).json({ success: false, message: 'Error deactivating specialty' });
  }
});

export default router;