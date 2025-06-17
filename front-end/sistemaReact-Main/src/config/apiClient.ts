import axios from 'axios';
import { API_BASE_URL as BASE_URL_CONSTANTE } from './apiConfig';

// Crear una instancia personalizada de axios
const apiClient = axios.create({
  baseURL: BASE_URL_CONSTANTE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Agregar timeout si es necesario
  timeout: 15000, // 15 segundos
});

// Variable para almacenar el token actual
let currentToken: string | null = null;

// Función para actualizar el token
export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

// Interceptor para añadir el token JWT a las cabeceras
apiClient.interceptors.request.use(
  (config) => {
    const token = currentToken || localStorage.getItem('token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Si la URL ya incluye la BASE_URL, la convertimos en relativa
    if (config.url && config.url.startsWith(BASE_URL_CONSTANTE)) {
      config.url = config.url.substring(BASE_URL_CONSTANTE.length);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores comunes
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Manejar error 401 (No autorizado)
      if (status === 401) {
        localStorage.removeItem('token');
        currentToken = null;
      }
      
      // Log detallado para debugging
      console.error(`Error ${status}:`, data?.message || 'Error en la solicitud');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;