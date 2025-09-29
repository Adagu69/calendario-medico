import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection';
import { verifyToken, requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET /api/users - Obtener todos los usuarios (solo admin)
router.get('/', verifyToken, requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query('SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM sgh_users ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener usuarios' 
    });
  }
});

// GET /api/users/:id - Obtener un usuario específico
router.get('/:id', verifyToken, requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM sgh_users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener usuario' 
    });
  }
});

// POST /api/users - Crear nuevo usuario
router.post('/', 
  verifyToken, 
  requireAdmin,
  [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('first_name').notEmpty().withMessage('El nombre es requerido'),
    body('last_name').notEmpty().withMessage('El apellido es requerido'),
    body('role').isIn(['admin', 'gerencia', 'jefe', 'doctor']).withMessage('Rol inválido'),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const { username, email, password, first_name, last_name, role } = req.body;

    try {
      // Verificar si el email o username ya existen
      const existingUser = await pool.query('SELECT * FROM sgh_users WHERE email = $1 OR username = $2', [email, username]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El email o nombre de usuario ya está en uso'
        });
      }

      // Hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Crear nuevo usuario
      const newUserResult = await pool.query(
        'INSERT INTO sgh_users (username, email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role, is_active, created_at',
        [username, email, hashedPassword, first_name, last_name, role]
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: newUserResult.rows[0]
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear usuario' 
      });
    }
  }
);

// PUT /api/users/:id - Actualizar usuario
router.put('/:id',
  verifyToken,
  requireAdmin,
  [
    body('username').optional().notEmpty().withMessage('El nombre de usuario no puede estar vacío'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('first_name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('last_name').optional().notEmpty().withMessage('El apellido no puede estar vacío'),
    body('role').optional().isIn(['admin', 'gerencia', 'jefe', 'doctor']).withMessage('Rol inválido'),
    body('is_active').optional().isBoolean().withMessage('El estado de activación debe ser un booleano'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { username, email, first_name, last_name, role, is_active, password } = req.body;

    try {
      // Verificar si el usuario existe
      const userResult = await pool.query('SELECT * FROM sgh_users WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Construir la consulta de actualización dinámicamente
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (username !== undefined) {
        fields.push(`username = $${paramCount++}`);
        values.push(username);
      }
      if (email !== undefined) {
        fields.push(`email = $${paramCount++}`);
        values.push(email);
      }
      if (first_name !== undefined) {
        fields.push(`first_name = $${paramCount++}`);
        values.push(first_name);
      }
      if (last_name !== undefined) {
        fields.push(`last_name = $${paramCount++}`);
        values.push(last_name);
      }
      if (role !== undefined) {
        fields.push(`role = $${paramCount++}`);
        values.push(role);
      }
       if (is_active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      if (password && password.trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        fields.push(`password = $${paramCount++}`);
        values.push(hashedPassword);
      }

      if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No se proporcionaron datos para actualizar'
        });
      }

      const query = `UPDATE sgh_users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`;
      values.push(id);

      await pool.query(query, values);

      const result = await pool.query('SELECT id, username, email, first_name, last_name, role, is_active, created_at, updated_at FROM sgh_users WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar usuario' 
      });
    }
  }
);

// DELETE /api/users/:id - Eliminar usuario (soft delete)
router.delete('/:id', verifyToken, requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    if (currentUser.id === parseInt(id, 10)) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propio usuario'
      });
    }

    const result = await pool.query('UPDATE sgh_users SET is_active = false WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar usuario' 
    });
  }
});

export default router;
