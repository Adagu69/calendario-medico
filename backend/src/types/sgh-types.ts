// SGH Calendar System Types
export interface SGHUser {
  id: number;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'gerencia' | 'jefe' | 'doctor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SGHSection {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_name: string; // Added for consistency with frontend
  chief_doctor_id?: number; // Added for consistency
}

export interface SGHUserSection {
  id: number;
  user_id: number;
  section_id: number;
  role: 'jefe' | 'member';
  assigned_at: string;
}

export interface SGHSpecialty {
  id: number;
  section_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SGHDoctor {
  id: number;
  user_id?: number;
  specialty_id: number;
  code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  document_type: 'DNI' | 'CEX' | 'PAS';
  document_number: string;
  profession: string;
  license_number: string;
  email?: string;
  phone?: string;
  photo?: string;
  section_id: number;
  is_chief: boolean;
  is_active: boolean;
  join_date: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: SGHUser;
  specialty?: SGHSpecialty;
}

export interface SGHMonth {
  id: number;
  doctor_id: number;
  specialty_id: number;
  year: number;
  month: number;
  status: 'draft' | 'published';
  theme_config: MonthThemeConfig;
  published_at?: string;
  published_by?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Relations
  doctor?: SGHDoctor;
  specialty?: SGHSpecialty;
  time_slots?: SGHTimeSlot[];
  days?: SGHMonthDay[];
  published_by_user?: SGHUser;
  created_by_user?: SGHUser;
}

export interface SGHTimeSlot {
  id: number;
  month_id: number;
  name: string;
  start_time: string; // "08:00"
  end_time: string;   // "14:00"
  color: string;     // "#ffeb3b"
  created_at: string;
  updated_at: string;
}

export interface SGHMonthDay {
  id: number;
  month_id: number;
  day: number; // 1-31
  time_slot_ids: number[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SGHChangeRequest {
  id: number;
  month_id: number;
  requested_by: number;
  day?: number;
  time_slot_id?: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  month?: SGHMonth;
  requested_by_user?: SGHUser;
  reviewed_by_user?: SGHUser;
  time_slot?: SGHTimeSlot;
}

export interface SGHAuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_by?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Relations
  changed_by_user?: SGHUser;
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
    border_radius?: number;
    spacing?: number;
  };
  doctor?: {
    avatar_url?: string;
    logo_url?: string;
    display_name?: string;
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
    border_radius: 8,
    spacing: 16
  },
  doctor: {
    display_name: ''
  }
};

// API Request/Response types
export interface CreateMonthRequest {
  doctor_id: number;
  specialty_id: number;
  year: number;
  month: number;
}

export interface UpdateMonthRequest {
  status?: 'draft' | 'published';
  theme_config?: Partial<MonthThemeConfig>;
}

export interface CreateTimeSlotRequest {
  month_id: number;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

export interface UpdateTimeSlotRequest {
  name?: string;
  start_time?: string;
  end_time?: string;
  color?: string;
}

export interface UpdateDayRequest {
  time_slot_ids: number[];
  notes?: string;
}

export interface CreateChangeRequestRequest {
  month_id: number;
  day?: number;
  time_slot_id?: number;
  message: string;
}

export interface ReviewChangeRequestRequest {
  status: 'approved' | 'rejected' | 'merged';
  review_notes?: string;
}

// Frontend state types
export interface MonthState {
  current_month: SGHMonth | null;
  time_slots: SGHTimeSlot[];
  days: { [day: number]: SGHMonthDay };
  change_requests: SGHChangeRequest[];
  is_dirty: boolean;
  is_saving: boolean;
  last_saved?: string;
  error?: string;
}

// Permission checking
export interface UserPermissions {
  can_edit_month: boolean;
  can_publish_month: boolean;
  can_view_month: boolean;
  can_create_change_request: boolean;
  can_review_change_requests: boolean;
  can_manage_doctors: boolean;
  can_manage_users: boolean;
}

// Validation schemas
export interface TimeSlotValidation {
  is_valid: boolean;
  errors: string[];
  overlaps?: SGHTimeSlot[];
}

export interface MonthValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}