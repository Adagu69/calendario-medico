import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection';
import { verifyToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/sections - Get all sections
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sgh_sections ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las secciones' });
  }
});

// POST /api/sections - Create a new section
router.post('/', 
  verifyToken, 
  requireAdmin,
  [
    body('name').notEmpty().withMessage('El nombre de la sección es requerido'),
    body('description').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: errors.array() });
    }

    const { name, description } = req.body;

    try {
      const result = await pool.query(
        'INSERT INTO sgh_sections (name, description) VALUES ($1, $2) RETURNING *',
        [name, description || null]
      );
      res.status(201).json({ success: true, data: result.rows[0], message: 'Sección creada exitosamente' });
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({ success: false, error: 'Error al crear la sección' });
    }
  }
);

// PUT /api/sections/:id - Update a section
router.put('/:id',
  verifyToken,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('El nombre de la sección es requerido'),
    body('description').optional().isString(),
    body('is_active').isBoolean().withMessage('El estado debe ser un valor booleano'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: errors.array() });
    }

    const { id } = req.params;
    const { name, description, is_active } = req.body;

    try {
      const result = await pool.query(
        'UPDATE sgh_sections SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        [name, description || null, is_active, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Sección no encontrada' });
      }

      res.json({ success: true, data: result.rows[0], message: 'Sección actualizada exitosamente' });
    } catch (error) {
      console.error('Error updating section:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar la sección' });
    }
  }
);

// DELETE /api/sections/:id - Delete a section
router.delete('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM sgh_sections WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Sección no encontrada' });
    }

    res.json({ success: true, message: 'Sección eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting section:', error);
    // Handle foreign key constraints error
    if ((error as any).code === '23503') {
        return res.status(400).json({ success: false, error: 'No se puede eliminar la sección porque tiene usuarios u otros datos asociados.' });
    }
    res.status(500).json({ success: false, error: 'Error al eliminar la sección' });
  }
});

export default router;