import type { SGHUser, SGHMonth, SGHDoctor } from '../types/sgh-types';

// Verificar permisos basado en el rol del usuario
export const checkPermissions = async (
  user: SGHUser, 
  action: string, 
  resource?: any
): Promise<boolean> => {
  
  // ADMIN tiene acceso total
  if (user.role === 'admin') {
    return true;
  }
  
  // GERENCIA tiene acceso total excepto gestión de usuarios
  if (user.role === 'gerencia') {
    const restrictedActions = ['create_user', 'edit_user', 'delete_user', 'manage_roles'];
    return !restrictedActions.includes(action);
  }
  
  // JEFE puede manejar su sección
  if (user.role === 'jefe') {
    switch (action) {
      case 'view_month':
      case 'create_month':
      case 'edit_month':
      case 'delete_month':
      case 'publish_month':
        // TODO: Verificar que el doctor/especialidad pertenece a su sección
        return await checkSectionPermission(user, resource);
      
      case 'review_change_request':
        return await checkSectionPermission(user, resource);
      
      case 'manage_doctors':
        return await checkSectionPermission(user, resource);
      
      default:
        return false;
    }
  }
  
  // DOCTOR solo puede ver sus propios meses y crear solicitudes
  if (user.role === 'doctor') {
    switch (action) {
      case 'view_month':
        // Solo puede ver sus propios meses
        return resource?.doctorId === getDoctorIdByUser(user.id);
      
      case 'create_change_request':
        return resource?.doctorId === getDoctorIdByUser(user.id);
      
      default:
        return false;
    }
  }
  
  return false;
};

// Verificar si el usuario es jefe de la sección del recurso
const checkSectionPermission = async (user: SGHUser, resource: any): Promise<boolean> => {
  // TODO: Implementar consulta a base de datos
  // 1. Obtener sectionId del doctor/especialidad del resource
  // 2. Verificar si user es jefe de esa sección en sgh_user_sections
  
  console.log('🔍 Checking section permission for user:', user.id, 'resource:', resource);
  
  // Por ahora, retornamos true para testing
  return true;
};

// Obtener doctorId asociado a un usuario
const getDoctorIdByUser = (userId: number): number | null => {
  // TODO: Implementar consulta a base de datos sgh_doctors
  // SELECT id FROM sgh_doctors WHERE user_id = ?
  
  console.log('🔍 Getting doctor ID for user:', userId);
  
  // Por ahora, retornamos null
  return null;
};

// Verificar permisos específicos para recursos
export const hasResourceAccess = async (
  user: SGHUser,
  resourceType: 'month' | 'doctor' | 'specialty',
  resourceId: number,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> => {
  
  if (user.role === 'admin' || user.role === 'gerencia') {
    return true;
  }
  
  // TODO: Implementar lógica específica por tipo de recurso
  
  return false;
};

// Verificar si el usuario puede acceder a una sección específica
export const canAccessSection = async (user: SGHUser, sectionId: number): Promise<boolean> => {
  if (user.role === 'admin' || user.role === 'gerencia') {
    return true;
  }
  
  if (user.role === 'jefe') {
    // TODO: Verificar en sgh_user_sections
    return true; // Mock
  }
  
  return false;
};

// Obtener lista de secciones que el usuario puede gestionar
export const getUserSections = async (user: SGHUser): Promise<number[]> => {
  if (user.role === 'admin' || user.role === 'gerencia') {
    // TODO: Retornar todas las secciones activas
    return [1, 2, 3, 4, 5]; // Mock
  }
  
  if (user.role === 'jefe') {
    // TODO: Consultar sgh_user_sections WHERE user_id = ? AND role = 'jefe'
    return [1]; // Mock
  }
  
  return [];
};