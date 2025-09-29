// Consistent types for the medical management system

export interface MedicalSection {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Specialty {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ExtendedDoctor {
  id: number;
  user_id: number | null;
  section_id: number;
  name: string;
  email: string;
  phone: string | null;
  license: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  section_name?: string;
  specialties?: Specialty[];
}

export interface DoctorSchedule {
  doctor_id: number;
  month: string; // YYYY-MM format
  shifts: ScheduleShift[];
  total_hours: number;
  is_approved: boolean;
  created_by: number;
  updated_by: number;
}

export interface ScheduleShift {
  id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  shift_type: 'morning' | 'afternoon' | 'night' | 'full_day';
  office?: string;
  notes?: string;
  color: string;
}

export interface SystemSettings {
  clinic_name: string;
  logo_url: string;
  background_color: string;
  accent_color: string;
  header_color: string;
  font_family: string;
  last_updated: string;
  updated_by: string;
}

export interface ExtendedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor' | 'viewer';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  // For section chiefs, this will be populated
  section_id?: number;
  section_name?: string;
}
