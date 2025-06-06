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

// Interceptor para añadir el token JWT a las cabeceras
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Añadiendo token a solicitud:', config.url);
    }
    
    // Si la URL ya incluye la BASE_URL, la convertimos en relativa
    if (config.url && config.url.startsWith(BASE_URL_CONSTANTE)) {
      config.url = config.url.substring(BASE_URL_CONSTANTE.length);
    }
    
    return config;
  },
  (error) => {
    console.error('Error en interceptor de solicitud:', error);
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores comunes
apiClient.interceptors.response.use(
  (response) => {
    // Procesar la respuesta exitosa si es necesario
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Manejar error 401 (No autorizado)
      if (status === 401) {
        console.warn('Error 401: No autorizado. Token inválido o expirado.');
        localStorage.removeItem('token');
        
        // Puedes redirigir a la página de login si deseas
        // window.location.href = '/login';
      }
      
      // Manejar error 403 (Prohibido)
      if (status === 403) {
        console.warn('Error 403: No tienes permisos para realizar esta acción.');
      }
      
      // Manejar error 404 (No encontrado)
      if (status === 404) {
        console.warn('Error 404: Recurso no encontrado.');
      }
      
      // Manejar error 500 (Error del servidor)
      if (status === 500) {
        console.error('Error 500: Error en el servidor.');
      }
      
      // Log detallado para debugging
      console.error(`Error ${status}:`, data?.message || 'Error en la solicitud', data);
    } else if (error.request) {
      // La solicitud se realizó pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor:', error.request);
    } else {
      // Error al configurar la solicitud
      console.error('Error al configurar la solicitud:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;