import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'https://intranet.clinica.local/api', // Esta será la URL base de tu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token JWT a las peticiones
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
