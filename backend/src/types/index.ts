// Base types
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User and authentication types
export interface User extends BaseEntity {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor';
  is_active: boolean;
  section_id?: number; // From the JOIN
  section_name?: string; // From the JOIN
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  expiresIn: string;
}

// Medical entities
export interface Specialty extends BaseEntity {
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface Office extends BaseEntity {
  name: string;
  type: 'consultorio' | 'procedimiento';
  equipment?: string[];
  is_active: boolean;
}

export interface TimeSlot extends BaseEntity {
  name: string;
  start_time: string;
  end_time: string;
  period: 'morning' | 'afternoon' | 'night';
  is_active: boolean;
}

export interface Doctor extends BaseEntity {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  license: string;
  photo?: string;
  specialties: string[];
  is_active: boolean;
}

export interface Appointment extends BaseEntity {
  patient_name: string;
  patient_phone?: string;
  patient_email?: string;
  specialty_id: string;
  doctor_id: string;
  office_id: string;
  time_slot_id: string;
  appointment_date: Date;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  created_by: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface CreateAppointmentRequest {
  patient_name: string;
  patient_phone?: string;
  patient_email?: string;
  specialty_id: string;
  doctor_id: string;
  office_id: string;
  time_slot_id: string;
  appointment_date: string;
  notes?: string;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  status?: Appointment['status'];
}

export interface AppointmentFilters {
  specialty_id?: string;
  doctor_id?: string;
  office_id?: string;
  status?: Appointment['status'];
  date_from?: string;
  date_to?: string;
  patient_name?: string;
}

// Calendar event type for frontend compatibility
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    appointment: Appointment;
    patientName: string;
    patientPhone?: string;
    specialtyName: string;
    doctorName: string;
    officeName: string;
    timeSlotName: string;
    notes?: string;
  };
}