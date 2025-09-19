import { dataAPI, appointmentsAPI } from './api';
import type { Specialty, Office, TimeSlot, MedicalDoctor, CalendarEvent, Appointment } from '@/types';

// Cache para datos que no cambian frecuentemente
let specialtiesCache: Specialty[] | null = null;
let officesCache: Office[] | null = null;
let timeSlotsCache: TimeSlot[] | null = null;
let doctorsCache: MedicalDoctor[] | null = null;

export const dataService = {
  // Especialidades
  async getSpecialties(): Promise<Specialty[]> {
    if (specialtiesCache) return specialtiesCache;
    
    try {
      const response = await dataAPI.getSpecialties();
      specialtiesCache = response.data.data;
      return specialtiesCache || [];
    } catch (error) {
      console.error('Error fetching specialties:', error);
      return [];
    }
  },

  // Consultorios
  async getOffices(): Promise<Office[]> {
    if (officesCache) return officesCache;
    
    try {
      const response = await dataAPI.getOffices();
      officesCache = response.data.data;
      return officesCache || [];
    } catch (error) {
      console.error('Error fetching offices:', error);
      return [];
    }
  },

  // Franjas horarias
  async getTimeSlots(): Promise<TimeSlot[]> {
    if (timeSlotsCache) return timeSlotsCache;
    
    try {
      const response = await dataAPI.getTimeSlots();
      timeSlotsCache = response.data.data;
      return timeSlotsCache || [];
    } catch (error) {
      console.error('Error fetching time slots:', error);
      return [];
    }
  },

  // Médicos
  async getDoctors(): Promise<MedicalDoctor[]> {
    if (doctorsCache) return doctorsCache;
    
    try {
      const response = await dataAPI.getDoctors();
      doctorsCache = response.data.data;
      return doctorsCache || [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return [];
    }
  },

  // Limpiar cache
  clearCache() {
    specialtiesCache = null;
    officesCache = null;
    timeSlotsCache = null;
    doctorsCache = null;
  }
};

export const appointmentService = {
  // Obtener eventos del calendario
  async getCalendarEvents(start?: string, end?: string): Promise<CalendarEvent[]> {
    try {
      const response = await appointmentsAPI.getCalendarEvents(start, end);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  },

  // Crear cita
  async createAppointment(appointmentData: any): Promise<Appointment | null> {
    try {
      const response = await appointmentsAPI.create(appointmentData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  // Actualizar cita
  async updateAppointment(id: string, appointmentData: any): Promise<Appointment | null> {
    try {
      const response = await appointmentsAPI.update(id, appointmentData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  // Eliminar cita
  async deleteAppointment(id: string): Promise<boolean> {
    try {
      await appointmentsAPI.delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }
};
