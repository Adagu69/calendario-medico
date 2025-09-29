import { apiClient } from './api';
import type { MedicalSection, ExtendedDoctor, ExtendedUser, SystemSettings, DoctorSchedule, Specialty } from '../types/medical';

// ===========================
// SECTION MANAGEMENT
// ===========================
export const sectionService = {
  async getAllSections(): Promise<MedicalSection[]> {
    const response = await apiClient.get('/sections');
    return response.data.data;
  },
  // Other section methods would go here (create, update, etc.)
};

// ===========================
// SPECIALTY MANAGEMENT
// ===========================
export const specialtyService = {
  async getAllSpecialties(): Promise<Specialty[]> {
    const response = await apiClient.get('/specialties');
    return response.data.data;
  },
};

// ===========================
// DOCTOR MANAGEMENT
// ===========================
export const doctorService = {
  async getDoctorsBySection(sectionId: number | string): Promise<ExtendedDoctor[]> {
    const response = await apiClient.get(`/doctors/section/${sectionId}`);
    return response.data.data;
  },

  async getAllDoctors(): Promise<ExtendedDoctor[]> {
    const response = await apiClient.get('/doctors');
    return response.data.data;
  },

  async createDoctor(doctor: Partial<Omit<ExtendedDoctor, 'id' | 'created_at' | 'updated_at'>>): Promise<ExtendedDoctor> {
    const response = await apiClient.post('/doctors', doctor);
    return response.data.data;
  },

  async updateDoctor(id: number, updates: Partial<Omit<ExtendedDoctor, 'id' | 'created_at' | 'updated_at'>>): Promise<ExtendedDoctor> {
    const response = await apiClient.put(`/doctors/${id}`, updates);
    return response.data.data;
  },

  async deactivateDoctor(id: number): Promise<{ message: string }> {
    const response = await apiClient.put(`/doctors/${id}/deactivate`);
    return response.data;
  },

  async reactivateDoctor(id: number): Promise<{ message: string }> {
    const response = await apiClient.put(`/doctors/${id}/reactivate`);
    return response.data;
  },
};

// ===========================
// SCHEDULE MANAGEMENT
// ===========================

export const scheduleService = {
  async getDoctorSchedule(doctorId: number, month: string): Promise<DoctorSchedule | null> {
    try {
      const response = await apiClient.get(`/schedules/doctor/${doctorId}/${month}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveCalendarChanges(doctorId: number | string, month: string, changes: any[]): Promise<void> {
    const response = await apiClient.post('/schedules/calendar-changes', { doctor_id: Number(doctorId), month, changes });
    return response.data;
  },

  async saveSchedule(schedulePayload: any): Promise<void> {
    const response = await apiClient.post('/schedules', schedulePayload);
    return response.data;
  },
};

// ===========================
// USER MANAGEMENT
// ===========================
export const userService = {
  async login(username: string, password: string): Promise<{ user: ExtendedUser; token: string }> {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  async getCurrentUser(): Promise<ExtendedUser> {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

};

// ===========================
// SETTINGS MANAGEMENT
// ===========================
export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get('/settings');
    return response.data.data;
  },

  async saveSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await apiClient.post('/settings', settings);
    return response.data.data;
  },
};


// ===========================
// REPORTS
// ===========================
export const reportService = {
  async downloadMonthlySchedule(params: {
    month: string;
    specialtyId?: number | string;
    serviceId?: number | string;
    doctorId?: number | string;
  }): Promise<Blob> {
    const { month, specialtyId, serviceId, doctorId } = params;

    const response = await apiClient.get('/reports/monthly-schedule', {
      params: {
        month,
        specialty_id: specialtyId || undefined,
        service_id: serviceId || undefined,
        doctor_id: doctorId || undefined,
      },
      responseType: 'blob'
    });

    return response.data;
  }
};
