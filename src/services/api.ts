import axios from 'axios';

const BASE_URL = 'http://localhost:3002/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('🔗 Making request to:', config.url);
    console.log('🎫 Token from localStorage:', token ? token.substring(0, 20) + '...' : 'No token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      // You can add redirect logic here if needed
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (identifier: string, password: string) =>
    apiClient.post('/auth/login', { identifier, password }),
  
  register: (userData: any) =>
    apiClient.post('/auth/register', userData),
  
  me: () =>
    apiClient.get('/auth/me'),
  
  refreshToken: () =>
    apiClient.post('/auth/refresh')
};

// Appointments API
export const appointmentsAPI = {
  getAll: (filters?: any) =>
    apiClient.get('/appointments', { params: filters }),
  
  getCalendarEvents: (start?: string, end?: string) =>
    apiClient.get('/appointments/calendar-events', { 
      params: { start, end } 
    }),
  
  getById: (id: string) =>
    apiClient.get(`/appointments/${id}`),
  
  create: (appointmentData: any) =>
    apiClient.post('/appointments', appointmentData),
  
  update: (id: string, appointmentData: any) =>
    apiClient.put(`/appointments/${id}`, appointmentData),
  
  delete: (id: string) =>
    apiClient.delete(`/appointments/${id}`)
};

// Data API
export const dataAPI = {
  getSpecialties: () =>
    apiClient.get('/data/specialties'),
  
  getOffices: () =>
    apiClient.get('/data/offices'),
  
  getTimeSlots: () =>
    apiClient.get('/data/time-slots'),
  
  getDoctors: () =>
    apiClient.get('/data/doctors')
};

// Users API
export const usersAPI = {
  getAll: () =>
    apiClient.get('/users'),
  
  getById: (id: string) =>
    apiClient.get(`/users/${id}`),
  
  create: (userData: any) =>
    apiClient.post('/users', userData),
  
  update: (id: string, userData: any) =>
    apiClient.put(`/users/${id}`, userData),
  
  delete: (id: string) =>
    apiClient.delete(`/users/${id}`)
};

// Sections API
export const sectionsAPI = {
  getAll: () =>
    apiClient.get('/sections'),
  
  getById: (id: string) =>
    apiClient.get(`/sections/${id}`),
  
  create: (sectionData: any) =>
    apiClient.post('/sections', sectionData),
  
  update: (id: string, sectionData: any) =>
    apiClient.put(`/sections/${id}`, sectionData),
  
  delete: (id: string) =>
    apiClient.delete(`/sections/${id}`)
};