import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import type { Usuario } from '../interfaces/Usuario';
import type { CredencialesLogin, RespuestaAutenticacion } from '../interfaces/Usuario';
import type { RolNombre } from '../interfaces/enums';
import { RUTAS_AUTENTICACION } from '../config/apiConfig';
import { setAuthToken } from '../config/apiClient';

// Create a custom axios instance to handle CORS issues
const apiAxios = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Remove problematic headers that cause CORS issues
apiAxios.interceptors.request.use(
  (config) => {
    // Remove Origin header that's causing CORS 403 error
    delete config.headers['Origin'];
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Constantes para los roles
const ROLE_ADMIN = 'ROLE_ADMIN';
const ROLE_ALMACENERO = 'ROLE_ALMACENERO';
const ROLE_CAJERO = 'ROLE_CAJERO';


interface TokenDecodificado {
  sub: string;
  authorities?: string[] | string; // Ahora puede ser array (nuevo formato) o string (viejo formato)
  exp: number;
  [key: string]: any;
}

interface ContextoAutenticacion {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  iniciarSesion: (credenciales: CredencialesLogin) => Promise<boolean>;
  cerrarSesion: () => void;
  tieneRol: (rol: RolNombre) => boolean;
}

const ContextoAuth = createContext<ContextoAutenticacion | undefined>(undefined);

export const useAuth = (): ContextoAutenticacion => {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return contexto;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const interceptorRef = useRef<number | null>(null);

  const extraerRolesDelToken = (decodificado: TokenDecodificado): RolNombre[] => {
    let roles: RolNombre[] = [];
    
    if (decodificado.authorities) {
      if (Array.isArray(decodificado.authorities)) {
        roles = decodificado.authorities as RolNombre[];
      } else if (typeof decodificado.authorities === 'string') {
        roles = decodificado.authorities.split(',').map(rol => rol.trim()) as RolNombre[];
      }
    }
    
    return roles;
  };

  const validarYEstablecerToken = (tokenAlmacenado: string) => {
    try {
      const decodificado = jwtDecode<TokenDecodificado>(tokenAlmacenado);
      const tiempoActual = Date.now() / 1000;
      
      if (decodificado.exp && decodificado.exp < tiempoActual) {
        throw new Error('Token expirado');
      }

      const nombreUsuario = decodificado.sub;
      const rolesUsuario = extraerRolesDelToken(decodificado);
      
      setToken(tokenAlmacenado);
      setAuthToken(tokenAlmacenado);
      
      setUsuario({
        usuario: nombreUsuario,
        roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
      });

      return true;
    } catch (error) {
      console.error('Error al validar token:', error);
      localStorage.removeItem('token');
      setToken(null);
      setAuthToken(null);
      setUsuario(null);
      return false;
    }
  };

  useEffect(() => {
    const tokenAlmacenado = localStorage.getItem('token');
    if (tokenAlmacenado) {
      validarYEstablecerToken(tokenAlmacenado);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (interceptorRef.current !== null) {
      axios.interceptors.request.eject(interceptorRef.current);
      interceptorRef.current = null;
    }
    
    interceptorRef.current = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setAuthToken(null);
          setUsuario(null);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const iniciarSesion = async (credenciales: CredencialesLogin): Promise<boolean> => {
    try {
      setError(null);
      const response = await axios.post<RespuestaAutenticacion>(
        RUTAS_AUTENTICACION.INICIAR_SESION,
        credenciales
      );

      const { jwt: nuevoToken } = response.data;
      localStorage.setItem('token', nuevoToken);
      
      return validarYEstablecerToken(nuevoToken);
    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      setError('Credenciales inválidas');
      return false;
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setUsuario(null);
    window.location.href = '/login';
  };

  const tieneRol = (rol: RolNombre): boolean => {
    if (!usuario?.roles) return false;
    return usuario.roles.some(r => r.nombreRol === rol);
  };

  return (
    <ContextoAuth.Provider
      value={{
        usuario,
        cargando,
        error,
        iniciarSesion,
        cerrarSesion,
        tieneRol,
      }}
    >
      {children}
    </ContextoAuth.Provider>
  );
};