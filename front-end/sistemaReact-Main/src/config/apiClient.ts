import axios from 'axios';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL as BASE_URL_CONSTANTE } from './apiConfig';
import type { TokenDecodificado } from '../types/TokenDecodificado';

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

// Variable para almacenar el token actual, pre-hidratada desde localStorage en el cliente
let currentToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

/** Minutos antes de expiración en que se emite el aviso de sesión próxima a expirar. */
export const UMBRAL_AVISO_SESION_MIN = 5;

// Función para actualizar el token y sincronizar con localStorage
export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
};

// Función para verificar si el token está próximo a expirar
export const isTokenExpiringSoon = (): boolean => {
  try {
    const token = currentToken;
    if (!token) return true;
    
    const decodificado = jwtDecode<TokenDecodificado>(token);
    const tiempoActual = Date.now() / 1000;
    
    // Solo devolver true si el token ya expiró realmente
    if (decodificado.exp && decodificado.exp < tiempoActual) {
      console.error('Token expirado');
      return true;
    }
    
    // Advertir cuando el token expira en menos de UMBRAL_AVISO_SESION_MIN minutos
    const minutosRestantes = decodificado.exp ? (decodificado.exp - tiempoActual) / 60 : Infinity;
    if (minutosRestantes < UMBRAL_AVISO_SESION_MIN && minutosRestantes > 0) {
      console.warn(`Token próximo a expirar en ${minutosRestantes.toFixed(1)} minutos`);
      // Emitir evento global para que la UI muestre el aviso
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('session-expiring-soon', {
            detail: { minutosRestantes: Math.ceil(minutosRestantes) },
          })
        );
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return false; // En caso de error, no bloquear la operación
  }
};

export const useSessionExpiryWarning = () => {
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ minutosRestantes: number }>;
      setMinutosRestantes(customEvent.detail.minutosRestantes);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('session-expiring-soon', handler);
      return () => window.removeEventListener('session-expiring-soon', handler);
    }
  }, []);

  return minutosRestantes;
};

// Interceptor para añadir el token JWT a las cabeceras
apiClient.interceptors.request.use(
  (config) => {
    const token = currentToken;
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Si la URL ya incluye la BASE_URL, la convertimos en relativa
    if (config.url?.startsWith(BASE_URL_CONSTANTE)) {
      config.url = config.url.substring(BASE_URL_CONSTANTE.length);
    }
    
    return config;
  },
  (error) => {
    console.error('Error en interceptor de request:', error);
    return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'));
  }
);

// Interceptor de respuesta: 401 aquí (esta instancia es la que usan los servicios).
// El axios "por defecto" no recibe estas respuestas; antes el token quedaba huérfano.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Solo cerrar sesión si el 401 viene realmente de un token inválido/expirado.
        // Cualquier otro 401 (endpoint sin handler, error puntual) se propaga sin expulsar.
        const data = error.response?.data as { error?: string; message?: string } | string | undefined;
        const textoError =
          typeof data === 'string'
            ? data
            : `${data?.error ?? ''} ${data?.message ?? ''}`;
        const tokenInvalido = /token|jwt|expirad|sesi[oó]n|usuario (no encontrado|deshabilitado)/i.test(
          textoError ?? ''
        );

        if (tokenInvalido) {
          localStorage.removeItem('token');
          setAuthToken(null);
          const path = window.location.pathname;
          if (path !== '/login' && !path.endsWith('/login')) {
            window.location.assign(`${window.location.origin}/login`);
          }
        }
        return Promise.reject(error);
      }

      // Handle server unavailable (cuando el servidor está apagado)
      if (status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.warn('Servidor no disponible. Los datos pueden estar desactualizados.');
      }

      // Propagate the error so UI can show proper error messages
      return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'));
    } else if (error.request) {
      // Error de red o servidor no accesible
      console.error('Error de red:', error.message);
      // Propagate network error so UI can handle it
      return Promise.reject(new Error('No se pudo conectar con el servidor. Verifique su conexión de red.'));
    }

    return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'));
  }
);

export default apiClient;