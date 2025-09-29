import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SGHUser, ApiResponse } from '../types/sgh-types';
import { JWT_SECRET_KEY } from '../config/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Token de acceso requerido' } as ApiResponse<null>);
            return;
        }
        
        const token = authHeader.substring(7);
        if (!token) {
            res.status(401).json({ success: false, error: 'Token de acceso requerido' } as ApiResponse<null>);
            return;
        }
        
        const decoded = jwt.verify(token, JWT_SECRET_KEY) as SGHUser;
        (req as any).user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ success: false, error: 'Token inválido o expirado' } as ApiResponse<null>);
    }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user as SGHUser;

      if (!user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' } as ApiResponse<null>);
        return;
      }
      
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ success: false, error: 'No tienes permisos para realizar esta acción' } as ApiResponse<null>);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' } as ApiResponse<null>);
    }
  };
};

export const verifyToken = authMiddleware;

// **CORRECCIÓN: Se usa 'admin' en lugar de 'super_admin' para coincidir con tu base de datos**
export const requireAdmin = roleMiddleware(['admin']);

// **CORRECCIÓN: Se usa 'jefe' y 'admin'**
export const requireSectionChief = roleMiddleware(['admin', 'jefe']);