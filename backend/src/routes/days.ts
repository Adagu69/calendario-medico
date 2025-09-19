import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { verifyToken } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { checkPermissions } from '../middleware/permissions';
import type { 
  SGHMonthDay, 
  UpdateDayRequest,
  ApiResponse 
} from '../types/sgh-types';

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Datos de entrada inválidos',
      errors: errors.array() 
    });
  }
  next();
};

// Validar que el día es válido para el mes/año
const isValidDay = (day: number, month: number, year: number): boolean => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
};

// ===========================
// ENDPOINTS DE DÍAS
// ===========================

// GET /api/days/month/:monthId - Obtener todos los días de un mes
router.get('/month/:monthId', verifyToken, [
  param('monthId').isInt().withMessage('monthId debe ser un número'),
  handleValidationErrors
], async (req: any, res: express.Response) => {
  try {
    const monthId = parseInt(req.params.monthId);
    const currentUser = req.user;
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'view_month', { monthId });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este mes'
      });
    }
    
    // TODO: Consultar días de la base de datos
    const days: SGHMonthDay[] = [];
    
    const response: ApiResponse<SGHMonthDay[]> = {
      success: true,
      data: days,
      message: 'Días obtenidos exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo días:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /api/days/:monthId/:day - Actualizar día específico
router.put('/:monthId/:day', verifyToken, [
  param('monthId').isInt().withMessage('monthId debe ser un número'),
  param('day').isInt({ min: 1, max: 31 }).withMessage('day debe estar entre 1 y 31'),
  body('timeSlotIds').isArray().withMessage('timeSlotIds debe ser un array'),
  body('timeSlotIds.*').isInt().withMessage('Cada timeSlotId debe ser un número'),
  body('notes').optional().isString().withMessage('notes debe ser un string'),
  handleValidationErrors
], auditLog, async (req: any, res: express.Response) => {
  try {
    const monthId = parseInt(req.params.monthId);
    const day = parseInt(req.params.day);
    const { timeSlotIds, notes }: UpdateDayRequest = req.body;
    const currentUser = req.user;
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { monthId });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este mes'
      });
    }
    
    // TODO: Obtener información del mes para validar el día
    const monthInfo = { year: 2025, month: 9 }; // Mock
    
    if (!isValidDay(day, monthInfo.month, monthInfo.year)) {
      return res.status(400).json({
        success: false,
        error: 'Día inválido para este mes'
      });
    }
    
    // TODO: Verificar que todos los timeSlotIds pertenecen al mes
    // TODO: Insertar o actualizar en base de datos (UPSERT)
    
    const updatedDay: SGHMonthDay = {
      id: Date.now(), // Mock ID
      monthId,
      day,
      timeSlotIds,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const response: ApiResponse<SGHMonthDay> = {
      success: true,
      data: updatedDay,
      message: 'Día actualizado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error actualizando día:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// DELETE /api/days/:monthId/:day - Limpiar día (eliminar asignaciones)
router.delete('/:monthId/:day', verifyToken, [
  param('monthId').isInt().withMessage('monthId debe ser un número'),
  param('day').isInt({ min: 1, max: 31 }).withMessage('day debe estar entre 1 y 31'),
  handleValidationErrors
], auditLog, async (req: any, res: express.Response) => {
  try {
    const monthId = parseInt(req.params.monthId);
    const day = parseInt(req.params.day);
    const currentUser = req.user;
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { monthId });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este mes'
      });
    }
    
    // TODO: Eliminar de base de datos o actualizar con array vacío
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'Día limpiado exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error limpiando día:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/days/:monthId/bulk-update - Actualizar múltiples días
router.post('/:monthId/bulk-update', verifyToken, [
  param('monthId').isInt().withMessage('monthId debe ser un número'),
  body('updates').isArray().withMessage('updates debe ser un array'),
  body('updates.*.day').isInt({ min: 1, max: 31 }).withMessage('day debe estar entre 1 y 31'),
  body('updates.*.timeSlotIds').isArray().withMessage('timeSlotIds debe ser un array'),
  body('updates.*.timeSlotIds.*').isInt().withMessage('Cada timeSlotId debe ser un número'),
  handleValidationErrors
], auditLog, async (req: any, res: express.Response) => {
  try {
    const monthId = parseInt(req.params.monthId);
    const { updates } = req.body;
    const currentUser = req.user;
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'edit_month', { monthId });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para editar este mes'
      });
    }
    
    // TODO: Procesar actualizaciones en lote
    // TODO: Validar todos los días y timeSlotIds
    // TODO: Ejecutar en transacción
    
    const updatedDays: SGHMonthDay[] = updates.map((update: any) => ({
      id: Date.now() + Math.random(), // Mock ID
      monthId,
      day: update.day,
      timeSlotIds: update.timeSlotIds,
      notes: update.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    const response: ApiResponse<SGHMonthDay[]> = {
      success: true,
      data: updatedDays,
      message: `${updates.length} días actualizados exitosamente`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error actualizando días en lote:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/days/:monthId/:day - Obtener día específico
router.get('/:monthId/:day', verifyToken, [
  param('monthId').isInt().withMessage('monthId debe ser un número'),
  param('day').isInt({ min: 1, max: 31 }).withMessage('day debe estar entre 1 y 31'),
  handleValidationErrors
], async (req: any, res: express.Response) => {
  try {
    const monthId = parseInt(req.params.monthId);
    const day = parseInt(req.params.day);
    const currentUser = req.user;
    
    // Verificar permisos
    const hasPermission = await checkPermissions(currentUser, 'view_month', { monthId });
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este mes'
      });
    }
    
    // TODO: Consultar día específico de la base de datos
    const dayData: SGHMonthDay | null = null;
    
    if (!dayData) {
      // Retornar día vacío si no existe
      const emptyDay: SGHMonthDay = {
        id: 0,
        monthId,
        day,
        timeSlotIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return res.json({
        success: true,
        data: emptyDay,
        message: 'Día obtenido (vacío)'
      });
    }
    
    const response: ApiResponse<SGHMonthDay> = {
      success: true,
      data: dayData,
      message: 'Día obtenido exitosamente'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error obteniendo día:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

export default router;