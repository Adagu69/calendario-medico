import type { MedicalSection, ExtendedDoctor, ExtendedUser, SystemSettings, DoctorSchedule } from '../types/medical';

// URL base del backend
const API_BASE_URL = 'http://localhost:3002/api';

// Utilidad para manejar respuestas de la API
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error HTTP: ${response.status}`);
  }
  return response.json();
}

// ===========================
// GESTIÓN DE SECCIONES MÉDICAS
// ===========================

export const sectionService = {
  // Obtener todas las secciones
  async getAllSections(): Promise<MedicalSection[]> {
    const response = await fetch(`${API_BASE_URL}/sections`);
    return handleApiResponse<MedicalSection[]>(response);
  },

  // Crear nueva sección
  async createSection(section: Omit<MedicalSection, 'id'>): Promise<MedicalSection> {
    const response = await fetch(`${API_BASE_URL}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(section),
    });
    return handleApiResponse<MedicalSection>(response);
  },

  // Actualizar sección
  async updateSection(id: string, updates: Partial<MedicalSection>): Promise<MedicalSection> {
    const response = await fetch(`${API_BASE_URL}/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleApiResponse<MedicalSection>(response);
  },

  // Asignar jefe de sección
  async assignChief(sectionId: string, doctorId: string): Promise<MedicalSection> {
    const response = await fetch(`${API_BASE_URL}/sections/${sectionId}/chief`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chiefDoctorId: doctorId }),
    });
    return handleApiResponse<MedicalSection>(response);
  }
};

// ===========================
// GESTIÓN DE DOCTORES EXPANDIDA
// ===========================

export const doctorService = {
  // Obtener doctores por sección
  async getDoctorsBySection(sectionId: string): Promise<ExtendedDoctor[]> {
    const response = await fetch(`${API_BASE_URL}/doctors/section/${sectionId}`);
    return handleApiResponse<ExtendedDoctor[]>(response);
  },

  // Obtener todos los doctores (solo para super admin)
  async getAllDoctors(): Promise<ExtendedDoctor[]> {
    const response = await fetch(`${API_BASE_URL}/doctors`);
    return handleApiResponse<ExtendedDoctor[]>(response);
  },

  // Crear nuevo doctor
  async createDoctor(doctor: Omit<ExtendedDoctor, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExtendedDoctor> {
    const response = await fetch(`${API_BASE_URL}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctor),
    });
    return handleApiResponse<ExtendedDoctor>(response);
  },

  // Actualizar doctor
  async updateDoctor(id: string, updates: Partial<ExtendedDoctor>): Promise<ExtendedDoctor> {
    const response = await fetch(`${API_BASE_URL}/doctors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, updatedAt: new Date().toISOString() }),
    });
    return handleApiResponse<ExtendedDoctor>(response);
  },

  // Desactivar doctor (eliminación lógica)
  async deactivateDoctor(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/doctors/${id}/deactivate`, {
      method: 'PUT',
    });
    await handleApiResponse<void>(response);
  },

  // Reactivar doctor
  async reactivateDoctor(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/doctors/${id}/reactivate`, {
      method: 'PUT',
    });
    await handleApiResponse<void>(response);
  },

  // Transferir doctor a otra sección
  async transferDoctor(doctorId: string, newSectionId: string): Promise<ExtendedDoctor> {
    const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/transfer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: newSectionId }),
    });
    return handleApiResponse<ExtendedDoctor>(response);
  }
};

// ===========================
// GESTIÓN DE HORARIOS
// ===========================

export const scheduleService = {
  // Obtener horarios de un doctor para un mes específico
  async getDoctorSchedule(doctorId: string, month: string): Promise<DoctorSchedule | null> {
    const response = await fetch(`${API_BASE_URL}/schedules/doctor/${doctorId}/${month}`);
    if (response.status === 404) return null;
    return handleApiResponse<DoctorSchedule>(response);
  },

  // Obtener horarios de toda una sección para un mes
  async getSectionSchedules(sectionId: string, month: string): Promise<DoctorSchedule[]> {
    const response = await fetch(`${API_BASE_URL}/schedules/section/${sectionId}/${month}`);
    return handleApiResponse<DoctorSchedule[]>(response);
  },

  // Guardar/actualizar horario completo de un doctor
  async saveSchedule(schedule: DoctorSchedule): Promise<DoctorSchedule> {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
    return handleApiResponse<DoctorSchedule>(response);
  },

  // Guardar cambios específicos del calendario (turnos individuales)
  async saveCalendarChanges(doctorId: string, month: string, shifts: any[]): Promise<DoctorSchedule> {
    const response = await fetch(`${API_BASE_URL}/schedules/calendar-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        month,
        shifts,
        updatedBy: localStorage.getItem('currentUser') || 'system'
      }),
    });
    return handleApiResponse<DoctorSchedule>(response);
  },

  // Aprobar horarios (solo jefes de sección)
  async approveSchedule(scheduleId: string): Promise<DoctorSchedule> {
    const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}/approve`, {
      method: 'PUT',
    });
    return handleApiResponse<DoctorSchedule>(response);
  },

  // Obtener horarios pendientes de aprobación
  async getPendingSchedules(sectionId?: string): Promise<DoctorSchedule[]> {
    const url = sectionId 
      ? `${API_BASE_URL}/schedules/pending/section/${sectionId}`
      : `${API_BASE_URL}/schedules/pending`;
    const response = await fetch(url);
    return handleApiResponse<DoctorSchedule[]>(response);
  }
};

// ===========================
// GESTIÓN DE CONFIGURACIÓN
// ===========================

export const settingsService = {
  // Obtener configuración actual
  async getSettings(): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    return handleApiResponse<SystemSettings>(response);
  },

  // Guardar configuración
  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        lastUpdated: new Date().toISOString(),
        updatedBy: localStorage.getItem('currentUser') || 'system'
      }),
    });
    return handleApiResponse<SystemSettings>(response);
  }
};

// ===========================
// GESTIÓN DE USUARIOS
// ===========================

export const userService = {
  // Autenticación
  async login(username: string, password: string): Promise<{ user: ExtendedUser; token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleApiResponse<{ user: ExtendedUser; token: string }>(response);
  },

  // Obtener usuario actual
  async getCurrentUser(): Promise<ExtendedUser> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return handleApiResponse<ExtendedUser>(response);
  },

  // Crear usuario (solo super admin)
  async createUser(user: Omit<ExtendedUser, 'id' | 'createdAt'>): Promise<ExtendedUser> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(user),
    });
    return handleApiResponse<ExtendedUser>(response);
  },

  // Verificar permisos
  hasPermission(user: ExtendedUser, resource: string, action: string, targetSectionId?: string): boolean {
    // Super admin tiene todos los permisos
    if (user.role === 'super_admin') return true;

    // Jefe de sección tiene permisos sobre su sección
    if (user.role === 'section_chief' && user.sectionId) {
      if (targetSectionId && targetSectionId !== user.sectionId) return false;
      
      const permission = user.permissions.find(p => p.resource === resource);
      return permission?.actions.includes(action as any) || false;
    }

    // Verificar permisos específicos para otros roles
    const permission = user.permissions.find(p => p.resource === resource);
    return permission?.actions.includes(action as any) || false;
  }
};

// ===========================
// GESTIÓN DE REPORTES
// ===========================

export const reportService = {
  // Generar reporte mensual por sección
  async generateMonthlyReport(sectionId: string, month: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reports/monthly/${sectionId}/${month}`);
    return handleApiResponse<any>(response);
  },

  // Exportar horarios a Excel
  async exportSchedulesToExcel(sectionId: string, month: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/reports/export/excel/${sectionId}/${month}`);
    if (!response.ok) {
      throw new Error('Error al generar el archivo Excel');
    }
    return response.blob();
  },

  // Obtener estadísticas generales
  async getGeneralStats(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reports/stats`);
    return handleApiResponse<any>(response);
  }
};
