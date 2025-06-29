import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL as BASE_URL_CONSTANTE } from './apiConfig';

// Interfaz para token decodificado
interface TokenDecodificado {
  sub: string;
  authorities?: string[] | string;
  exp: number;
  [key: string]: any;
}

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

// Función para verificar si el token está próximo a expirar
export const isTokenExpiringSoon = (): boolean => {
  try {
    const token = currentToken || localStorage.getItem('token');
    if (!token) return true;
    
    const decodificado = jwtDecode<TokenDecodificado>(token);
    const tiempoActual = Date.now() / 1000;
    
    // Solo devolver true si el token ya expiró realmente
    if (decodificado.exp && decodificado.exp < tiempoActual) {
      console.error('Token expirado');
      return true;
    }
    
    // Solo advertir si el token expira en menos de 30 segundos, pero no bloquear la operación
    if (decodificado.exp && decodificado.exp - tiempoActual < 30) {
      console.warn('Token próximo a expirar en menos de 30 segundos');
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return false; // En caso de error, no bloquear la operación
  }
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
// NOTA: El manejo de 401 se hace en AuthContext para evitar bucles infinitos
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      const method = error.config.method?.toLowerCase();

      // Handle unauthorized - Comentado para evitar conflicto con AuthContext
      // if (status === 401) {
      //   localStorage.removeItem('token');
      //   currentToken = null;
      //   // ... resto del manejo
      // }

      // Handle server unavailable (cuando el servidor está apagado)
      if (status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.warn('Servidor no disponible. Los datos pueden estar desactualizados.');
        
        // Para métodos GET, devolver array vacío para evitar errores en la UI
        if (method === 'get') {
          return Promise.resolve({ data: [] });
        }
      }

      // Otros estados
      if (status !== 401 && status < 500) {
        console.error(`Error ${status}:`, error.response.data?.message || error.response.data?.error || 'Error en la solicitud');
      }
    } else if (error.request) {
      // Error de red o servidor no accesible
      console.error('Error de red:', error.message);
      
      // Si es un método GET y hay error de red, devolver array vacío
      if (error.config?.method?.toLowerCase() === 'get') {
        console.warn('Error de red en GET request, devolviendo datos vacíos');
        return Promise.resolve({ data: [] });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;