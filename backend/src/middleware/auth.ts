import { SGHUser } from '../types/sgh-types'; // Import SGHUser
import { JWT_SECRET_KEY } from '../config/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth Header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header or invalid format');
      res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      } as ApiResponse);
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🎫 Token extracted:', token.substring(0, 20) + '...');
    
    if (!token) {
      console.log('❌ Empty token');
      res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      } as ApiResponse);
      return;
    }
    
    try {
      console.log('🔐 Using JWT_SECRET_KEY:', JWT_SECRET_KEY.substring(0, 10) + '...');
      const decoded = jwt.verify(token, JWT_SECRET_KEY) as SGHUser; // Use SGHUser
      console.log('✅ Token decoded successfully:', decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError);
      res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      } as ApiResponse);
      return;
    }
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    } as ApiResponse);
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        } as ApiResponse);
        return;
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'No tienes permisos para realizar esta acción'
        } as ApiResponse);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      } as ApiResponse);
    }
  };
};

// Alias para compatibilidad
export const verifyToken = authMiddleware;

// Middleware para requerir rol de administrador
export const requireAdmin = roleMiddleware(['super_admin']);

// Middleware para requerir rol de jefe de sección o administrador
export const requireSectionChief = roleMiddleware(['super_admin', 'section_chief']);
