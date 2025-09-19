import express from 'express';
import type { SGHUser } from '../types/sgh-types';

// Middleware para logging de auditoría
export const auditLog = (req: any, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Capturar información de la request
  const auditData = {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  };
  
  // Override del método send para capturar la respuesta
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Solo log cambios exitosos (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      console.log('📝 Audit Log:', {
        ...auditData,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        body: req.method !== 'GET' ? req.body : undefined
      });
      
      // TODO: Guardar en sgh_audit_log
      // saveAuditLog(auditData, req.body, data);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};