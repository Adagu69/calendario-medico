import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import pool from '../database/connection'; // Importar pool de conexión
import bcrypt from 'bcrypt'; // Importar bcrypt
import { JWT_SECRET_KEY } from '../config/jwt';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
    req.user = decoded;
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
    
    // Buscar usuario por email o username en la base de datos
    const result = await pool.query(
      'SELECT * FROM sgh_users WHERE (email = $1 OR username = $1) AND is_active = true',
      [identifier]
    );

    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Fallback a texto plano para usuarios existentes
      if (password !== user.password) {
          return res.status(401).json({ message: 'Credenciales inválidas' });
      }
    }
    
    // Generar token JWT
    const token = jwt.sign(
      userResponse, // Sign the full user object
      JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    // Actualizar último login
    await pool.query('UPDATE sgh_users SET last_login = NOW() WHERE id = $1', [user.id]);
    
    // Remover información sensible antes de enviar
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      // sectionId: user.sectionId,
      lastLogin: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
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
    
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      // sectionId: user.sectionId,
      lastLogin: user.last_login
    };
    
    res.json(userResponse);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Error al obtener información del usuario' });
  }
});

// POST /api/auth/register - Registrar un nuevo usuario (ejemplo)
router.post('/register', [
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('first_name').notEmpty(),
    body('last_name').notEmpty(),
    body('role').isIn(['admin', 'gerencia', 'jefe', 'doctor']),
    handleValidationErrors
], async (req: express.Request, res: express.Response) => {
    const { username, email, password, first_name, last_name, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `INSERT INTO sgh_users (username, email, password, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [username, email, hashedPassword, first_name, last_name, role]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering new user' });
    }
});


export default router;

