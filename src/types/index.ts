export interface Shift {
  id: string;
  label: string;
  color: string;
  start_time: string;
  end_time: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photo: string;
  shifts: Shift[];
  schedule: { [date: string]: string[] };
}

export interface DoctorFormData {
  name: string;
  specialty: string;
  photo: string;
}

export interface DesignSettings {
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  dayCellColor: string;
  doctorPhotoSize: number;
  clinicLogoSize: number;
  headerColor: string;
  accentColor: string;
  doctorNameSize: number;
  specialtySize: number;
}

// === NUEVAS INTERFACES PARA FULLCALENDAR SYSTEM ===

export interface Specialty {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Office {
  id: string;
  name: string;
  type: 'consultorio' | 'procedimiento'; // C1-C4 vs Espirometría
  equipment?: string[];
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "14:00"
  period: 'morning' | 'afternoon' | 'night';
}

export interface MedicalDoctor {
  id: string;
  name: string;
  specialties: string[];
  specialtyIds: string[];
  phone?: string;
  email?: string;
  license?: string;
  photo?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone?: string;
  specialtyId: string;
  doctorId: string;
  officeId: string;
  timeSlotId: string;
  date: string; // YYYY-MM-DD format
  notes?: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number | string;
  username: string;
  email: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor' | 'viewer';
  specialtyAccess: string[];
  name: string;
  section_id?: number | null;
  section_name?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    doctorId: string;
    doctorName: string;
    specialtyId: string;
    specialtyName: string;
    officeId: string;
    officeName: string;
    timeSlotId: string;
    patientName?: string;
    patientPhone?: string;
    notes?: string;
    createdAt?: string;
    appointment?: Appointment;
  };
}

export interface CalendarFilters {
  specialties: string[];
  offices: string[];
  doctors: string[];
}
