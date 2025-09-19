// Tipos TypeScript para el backend

export interface MedicalSection {
  id: string;
  name: 'pediatria' | 'ginecologia' | 'especialidades_pediatricas' | 'especialidades_adultos';
  displayName: string;
  chiefDoctorId?: string | null;
  isActive: boolean;
  monthlyCapacity: number;
}

export interface ExtendedDoctor {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: 'DNI' | 'CEX' | 'PAS';
  documentNumber: string;
  profession: string;
  licenseNumber: string;
  email?: string;
  phone?: string;
  photo: string;
  sectionId: string;
  isChief: boolean;
  isActive: boolean;
  joinDate: string;
  workSchedule: any;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'full_day';
  office?: string;
  notes?: string;
  color: string;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  month: string;
  shifts: ScheduleShift[];
  totalHours: number;
  isApproved: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  clinicName: string;
  logoUrl: string;
  backgroundColor: string;
  accentColor: string;
  headerColor: string;
  fontFamily: string;
  doctorPhotoSize: number;
  doctorNameSize: number;
  specialtySize: number;
  clinicLogoSize: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface UserPermission {
  resource: 'doctors' | 'schedules' | 'reports' | 'settings' | 'users';
  actions: ('create' | 'read' | 'update' | 'delete')[];
  scope: 'all' | 'own_section' | 'own_data';
}

export interface ExtendedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'section_chief' | 'viewer' | 'doctor';
  sectionId?: string;
  permissions: UserPermission[];
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}
