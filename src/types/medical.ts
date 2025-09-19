// Tipos expandidos para el sistema completo de gestión médica

export interface MedicalSection {
  id: string;
  name: string;
  display_name: string;
  chief_doctor_id?: string; // ID del doctor jefe de la sección
  is_active: boolean;
  monthly_capacity: number; // Capacidad estimada por mes
}

export interface ExtendedDoctor {
  id: string;
  code: string; // Código único del doctor
  first_name: string;
  last_name: string;
  full_name: string;
  document_type: 'DNI' | 'CEX' | 'PAS';
  document_number: string;
  profession: string;
  license_number: string;
  email?: string;
  phone?: string;
  photo: string;
  section_id: string; // Referencia a MedicalSection
  is_chief: boolean; // Si es jefe de sección
  is_active: boolean; // Para desactivación lógica
  join_date: string; // Fecha de ingreso
  work_schedule: DoctorSchedule;
  created_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  doctor_id: string;
  month: string; // YYYY-MM format
  shifts: ScheduleShift[];
  total_hours: number;
  is_approved: boolean; // Si el horario fue aprobado por el jefe
  created_by: string; // Usuario que creó el horario
  updated_by: string; // Usuario que modificó por última vez
}

export interface ScheduleShift {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  shift_type: 'morning' | 'afternoon' | 'night' | 'full_day';
  office?: string; // Consultorio asignado
  notes?: string;
  color: string; // Color para visualización
}

export interface SystemSettings {
  clinic_name: string;
  logo_url: string;
  background_color: string;
  accent_color: string;
  header_color: string;
  font_family: string;
  doctor_photo_size: number;
  doctor_name_size: number;
  specialty_size: number;
  clinic_logo_size: number;
  last_updated: string;
  updated_by: string;
}

export interface ExtendedUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor';
  section_id?: string;
  section_name?: string;
  permissions: UserPermission[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface UserPermission {
  resource: 'doctors' | 'schedules' | 'reports' | 'settings' | 'users';
  actions: ('create' | 'read' | 'update' | 'delete')[];
  scope: 'all' | 'own_section' | 'own_data';
}

export interface MonthlyReport {
  section_id: string;
  month: string;
  total_doctors: number;
  active_doctors: number;
  total_scheduled_hours: number;
  average_hours_per_doctor: number;
  pending_approvals: number;
  generated_at: string;
  generated_by: string;
}