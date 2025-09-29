import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import pool from '../database/connection';
import bcrypt from 'bcrypt';
import { JWT_SECRET_KEY } from '../config/jwt';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
  }
  next();
};

// Middleware para verificar token JWT
const verifyToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY) as any;
    req.user = {
      id: decoded.userId ?? decoded.id,
      role: decoded.role,
      section_id: decoded.sectionId ?? decoded.section_id ?? null
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// ===========================
// RUTAS DE AUTENTICACIÓN
// ===========================

// POST /api/auth/login - Iniciar sesión
router.post('/login', [
  body('identifier').notEmpty().withMessage('El identificador (usuario o email) es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { identifier, password } = req.body;
  
    const result = await pool.query(
      'SELECT * FROM sgh_users WHERE (email = $1 OR username = $1) AND is_active = true',
      [identifier]
    );

    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
    
     const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const sectionResult = await pool.query(
      `SELECT us.section_id, s.name AS section_name
       FROM sgh_user_sections us
       LEFT JOIN sgh_sections s ON s.id = us.section_id
       WHERE us.user_id = $1
       ORDER BY us.assigned_at DESC
       LIMIT 1`,
      [user.id]
    );

    const sectionId: number | null = sectionResult.rows[0]?.section_id ?? null;
    const sectionName: string | null = sectionResult.rows[0]?.section_name ?? null;

    const userPayloadForFrontend = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      section_id: sectionId,
      section_name: sectionName,
      specialtyAccess: sectionId ? [String(sectionId)] : [],
    };

    const tokenPayload = {
      userId: user.id,
      role: user.role,
      sectionId
    };
    
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );
    
     await pool.query('UPDATE sgh_users SET last_login = NOW() WHERE id = $1', [user.id]);
    
  res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: userPayloadForFrontend,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error en el servidor' });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', verifyToken, async (req: any, res: express.Response) => {
  try {
    const result = await pool.query('SELECT * FROM sgh_users WHERE id = $1 AND is_active = true', [req.user.id]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const sectionResult = await pool.query(
      `SELECT us.section_id, s.name AS section_name
       FROM sgh_user_sections us
       LEFT JOIN sgh_sections s ON s.id = us.section_id
       WHERE us.user_id = $1
       ORDER BY us.assigned_at DESC
       LIMIT 1`,
      [user.id]
    );

    const sectionId: number | null = sectionResult.rows[0]?.section_id ?? null;
    const sectionName: string | null = sectionResult.rows[0]?.section_name ?? null;

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      lastLogin: user.last_login,
      section_id: sectionId,
      section_name: sectionName
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Error al obtener información del usuario' });
  }
});

// POST /api/auth/register - Registrar un nuevo usuario
router.post('/register', [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido'),
    body('email').isEmail().withMessage('El email es inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('first_name').notEmpty().withMessage('El nombre es requerido'),
    body('last_name').notEmpty().withMessage('El apellido es requerido'),
    handleValidationErrors
], async (req: express.Request, res: express.Response) => {
    const { username, email, password, first_name, last_name } = req.body;

    try {
        const existingUserCheck = await pool.query('SELECT id FROM sgh_users WHERE email = $1 OR username = $2', [email, username]);
        
        // **CORRECCIÓN: Se verifica que rowCount no sea null antes de usarlo.**
       if (existingUserCheck && existingUserCheck.rowCount && existingUserCheck.rowCount > 0) {
            return res.status(409).json({ success: false, error: 'El email o nombre de usuario ya existe.' });
        }

        const userCountResult = await pool.query('SELECT COUNT(*) FROM sgh_users');
        const role = parseInt(userCountResult.rows[0].count, 10) === 0 ? 'admin' : 'doctor';

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUserResult = await pool.query(
            `INSERT INTO sgh_users (username, email, password, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, first_name, last_name, role, created_at`,
            [username, email, hashedPassword, first_name, last_name, role]
        );

        res.status(201).json({
            success: true,
            message: `Usuario '${username}' registrado exitosamente como '${role}'. Ahora puedes iniciar sesión.`,
            data: newUserResult.rows[0]
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ success: false, error: 'Error al registrar el nuevo usuario.' });
    }
 });

 export default router;
