import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection';
import { defaultTheme } from '../types/sgh-types'; // Import default settings
import type { SystemSettings, ApiResponse, SGHUser } from '../types/sgh-types';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Helper to get current settings from DB or create default
const getSystemSettings = async (): Promise<SystemSettings> => {
  const client = await pool.connect();
  try {
    let result = await client.query('SELECT * FROM sgh_settings LIMIT 1');
    if (result.rowCount === 0) {
      // Insert default settings if none exist
      const defaultSettings = {
        clinic_name: 'TUASUSALUD',
        logo_url: '/images/logito1.png',
        background_color: '#ffffff',
        accent_color: '#3b82f6',
        header_color: '#1f2937',
        font_family: 'Inter',
        doctor_photo_size: 50,
        doctor_name_size: 14,
        specialty_size: 12,
        clinic_logo_size: 40,
      };
      const insertResult = await client.query(
        `INSERT INTO sgh_settings (
          clinic_name, logo_url, background_color, accent_color, header_color, 
          font_family, doctor_photo_size, doctor_name_size, specialty_size, clinic_logo_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        Object.values(defaultSettings)
      );
      return insertResult.rows[0];
    }
    return result.rows[0];
  } finally {
    client.release();
  }
};

// ===========================
// RUTAS DE CONFIGURACIÓN
// ===========================

// GET /api/settings - Obtener configuración actual del sistema
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const settings = await getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error);
    res.status(500).json({ success: false, message: 'Error al obtener configuración del sistema' });
  }
});

// POST /api/settings - Guardar configuración del sistema
router.post('/', [
  body('clinic_name').optional().isLength({ min: 1 }).withMessage('El nombre de la clínica no puede estar vacío'),
  body('logo_url').optional().isString().withMessage('URL del logo inválida'),
  body('background_color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color de fondo inválido'),
  body('accent_color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color de acento inválido'),
  body('header_color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color de encabezado inválido'),
  body('font_family').optional().isString().withMessage('Fuente inválida'),
  body('doctor_photo_size').optional().isInt({ min: 20, max: 200 }).withMessage('Tamaño de foto debe estar entre 20 y 200'),
  body('doctor_name_size').optional().isInt({ min: 8, max: 32 }).withMessage('Tamaño de nombre debe estar entre 8 y 32'),
  body('specialty_size').optional().isInt({ min: 6, max: 24 }).withMessage('Tamaño de especialidad debe estar entre 6 y 24'),
  body('clinic_logo_size').optional().isInt({ min: 20, max: 100 }).withMessage('Tamaño de logo debe estar entre 20 y 100'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const updates: Partial<SystemSettings> = req.body;
    const currentUser = req.user as SGHUser; // Assuming req.user is populated by verifyToken

    const currentSettings = await getSystemSettings(); // Ensure we have an ID to update

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push((updates as any)[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No se proporcionaron datos para actualizar' });
    }

    const queryText = `UPDATE sgh_settings SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP, updated_by = $${paramIndex} WHERE id = $${paramIndex + 1} RETURNING *`;
    values.push(currentUser.id || null); // updated_by
    values.push(currentSettings.id); // WHERE id

    const result = await pool.query(queryText, values);
    res.json({ success: true, data: result.rows[0], message: 'Configuración guardada exitosamente' });
  } catch (error) {
    console.error('Error al guardar configuración del sistema:', error);
    res.status(500).json({ success: false, message: 'Error al guardar configuración del sistema' });
  }
});

// PUT /api/settings/reset - Restablecer configuración a valores por defecto
router.put('/reset', async (req: express.Request, res: express.Response) => {
  try {
    const currentUser = req.user as SGHUser;
    const currentSettings = await getSystemSettings();

    const defaultSettings = {
      clinic_name: 'TUASUSALUD',
      logo_url: '/images/logito1.png',
      background_color: '#ffffff',
      accent_color: '#3b82f6',
      header_color: '#1f2937',
      font_family: 'Inter',
      doctor_photo_size: 50,
      doctor_name_size: 14,
      specialty_size: 12,
      clinic_logo_size: 40,
    };

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in defaultSettings) {
      if (defaultSettings.hasOwnProperty(key)) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push((defaultSettings as any)[key]);
      }
    }

    const queryText = `UPDATE sgh_settings SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP, updated_by = $${paramIndex} WHERE id = $${paramIndex + 1} RETURNING *`;
    values.push(currentUser.id || null);
    values.push(currentSettings.id);

    const result = await pool.query(queryText, values);
    res.json({ success: true, data: result.rows[0], message: 'Configuración restablecida a valores por defecto' });
  } catch (error) {
    console.error('Error al restablecer configuración:', error);
    res.status(500).json({ success: false, message: 'Error al restablecer configuración' });
  }
});

// GET /api/settings/export - Exportar configuración actual
router.get('/export', async (req: express.Request, res: express.Response) => {
  try {
    const settings = await getSystemSettings();
    const exportData = {
      ...settings,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=tuasusalud-settings.json');
    res.json(exportData);
  } catch (error) {
    console.error('Error al exportar configuración:', error);
    res.status(500).json({ success: false, message: 'Error al exportar configuración' });
  }
});

// POST /api/settings/import - Importar configuración desde archivo
router.post('/import', [
  body('settings').isObject().withMessage('Los datos de configuración deben ser un objeto'),
  handleValidationErrors
], async (req: express.Request, res: express.Response) => {
  try {
    const { settings } = req.body;
    const currentUser = req.user as SGHUser;
    const currentSettings = await getSystemSettings();
    
    const requiredKeys = ['clinic_name', 'background_color', 'accent_color'];
    const hasRequiredKeys = requiredKeys.every(key => (settings as any)[key] !== undefined);
    
    if (!hasRequiredKeys) {
      return res.status(400).json({ 
        success: false,
        message: 'El archivo de configuración no contiene todas las claves requeridas' 
      });
    }
    
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in settings) {
      if (settings.hasOwnProperty(key)) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push((settings as any)[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No se proporcionaron datos para importar' });
    }

    const queryText = `UPDATE sgh_settings SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP, updated_by = $${paramIndex} WHERE id = $${paramIndex + 1} RETURNING *`;
    values.push(currentUser.id || null);
    values.push(currentSettings.id);

    const result = await pool.query(queryText, values);
    res.json({ success: true, data: result.rows[0], message: 'Configuración importada correctamente' });
  } catch (error) {
    console.error('Error al importar configuración:', error);
    res.status(500).json({ success: false, message: 'Error al importar configuración' });
  }
});

export default router;