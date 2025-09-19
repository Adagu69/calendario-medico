// SGH Calendar System Types para Frontend
export interface SGHUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SGHSection {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SGHSpecialty {
  id: number;
  sectionId: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SGHDoctor {
  id: number;
  userId?: number;
  specialtyId: number;
  name: string;
  email: string;
  phone?: string;
  license?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: SGHUser;
  specialty?: SGHSpecialty;
}

export interface SGHMonth {
  id: number;
  doctorId: number;
  specialtyId: number;
  year: number;
  month: number;
  status: 'draft' | 'published';
  themeConfig: MonthThemeConfig;
  publishedAt?: string;
  publishedBy?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  doctor?: SGHDoctor;
  specialty?: SGHSpecialty;
  timeSlots?: SGHTimeSlot[];
  days?: SGHMonthDay[];
  publishedByUser?: SGHUser;
  createdByUser?: SGHUser;
}

export interface SGHTimeSlot {
  id: number;
  monthId: number;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "14:00"
  color: string;     // "#ffeb3b"
  createdAt: string;
  updatedAt: string;
}

export interface SGHMonthDay {
  id: number;
  monthId: number;
  day: number; // 1-31
  timeSlotIds: number[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SGHChangeRequest {
  id: number;
  monthId: number;
  requestedBy: number;
  day?: number;
  timeSlotId?: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  month?: SGHMonth;
  requestedByUser?: SGHUser;
  reviewedByUser?: SGHUser;
  timeSlot?: SGHTimeSlot;
}

// Theme configuration for each month
export interface MonthThemeConfig {
  font?: {
    family?: string;
    size?: number;
    weight?: string;
  };
  colors?: {
    background?: string;
    text?: string;
    primary?: string;
    secondary?: string;
  };
  layout?: {
    borderRadius?: number;
    spacing?: number;
  };
  doctor?: {
    avatarUrl?: string;
    logoUrl?: string;
    displayName?: string;
  };
}

// Default theme
export const defaultTheme: MonthThemeConfig = {
  font: {
    family: 'Inter',
    size: 14,
    weight: 'normal'
  },
  colors: {
    background: '#ffffff',
    text: '#374151',
    primary: '#3b82f6',
    secondary: '#e5e7eb'
  },
  layout: {
    borderRadius: 8,
    spacing: 16
  },
  doctor: {
    displayName: ''
  }
};

// Frontend state types
export interface MonthState {
  currentMonth: SGHMonth | null;
  timeSlots: SGHTimeSlot[];
  days: { [day: number]: SGHMonthDay };
  changeRequests: SGHChangeRequest[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: string;
  error?: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Calendar UI Types
export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  slots: SGHTimeSlot[];
  hasContent: boolean;
}

export interface CalendarWeek {
  days: CalendarDay[];
  weekNumber: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
  monthName: string;
}

// Component Props
export interface CalendarGridProps {
  monthData: SGHMonth;
  timeSlots: SGHTimeSlot[];
  days: { [day: number]: SGHMonthDay };
  onDayClick: (day: number) => void;
  onDayUpdate: (day: number, timeSlotIds: number[]) => void;
  isReadOnly?: boolean;
}

export interface DayPopoverProps {
  day: number;
  monthData: SGHMonth;
  timeSlots: SGHTimeSlot[];
  selectedSlots: number[];
  onSlotsChange: (slotIds: number[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export interface SlotsModalProps {
  monthData: SGHMonth;
  timeSlots: SGHTimeSlot[];
  onSlotsUpdate: (slots: SGHTimeSlot[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export interface TimeSlotForm {
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface HeaderPickerProps {
  currentMonth: number;
  currentYear: number;
  doctors: SGHDoctor[];
  specialties: SGHSpecialty[];
  selectedDoctorId?: number;
  selectedSpecialtyId?: number;
  onMonthChange: (month: number, year: number) => void;
  onYearChange: (year: number) => void;
  onDoctorChange: (doctor: SGHDoctor) => void;
  onSpecialtyChange: (specialty: SGHSpecialty) => void;
  onSlotsManage: () => void;
  onThemeCustomize: () => void;
  monthStatus?: 'draft' | 'published';
}

export interface ThemeModalProps {
  currentTheme: MonthThemeConfig;
  onThemeUpdate: (theme: MonthThemeConfig) => void;
  onClose: () => void;
  isOpen: boolean;
}

export interface HeaderPickerProps {
  doctors: SGHDoctor[];
  specialties: SGHSpecialty[];
  selectedDoctor?: SGHDoctor;
  selectedSpecialty?: SGHSpecialty;
  currentYear: number;
  currentMonth: number;
  onDoctorChange: (doctor: SGHDoctor) => void;
  onSpecialtyChange: (specialty: SGHSpecialty) => void;
  onMonthChange: (year: number, month: number) => void;
}

// Validation types
export interface TimeSlotValidation {
  isValid: boolean;
  errors: string[];
  overlaps?: SGHTimeSlot[];
}

export interface MonthValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Utility types for forms
export interface CreateTimeSlotForm {
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface UpdateDayForm {
  timeSlotIds: number[];
  notes?: string;
}

export interface CreateChangeRequestForm {
  day?: number;
  timeSlotId?: number;
  message: string;
}