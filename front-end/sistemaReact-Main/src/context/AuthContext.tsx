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
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Usar useRef para almacenar el interceptor actual
  const interceptorRef = useRef<number | null>(null);

  // Función mejorada para extraer roles del token
  const extraerRolesDelToken = (decodificado: TokenDecodificado): RolNombre[] => {
    console.log('Datos del token decodificado:', decodificado);
    let roles: RolNombre[] = [];
    
    // Verificar si authorities existe y procesarlo según su tipo
    if (decodificado.authorities) {
      console.log('Authorities del token:', decodificado.authorities);
      
      // Si es un array (nuevo formato), usarlo directamente
      if (Array.isArray(decodificado.authorities)) {
        roles = decodificado.authorities as RolNombre[];
      } 
      // Si es un string (formato antiguo), dividirlo por comas
      else if (typeof decodificado.authorities === 'string') {
        roles = decodificado.authorities.split(',').map(rol => rol.trim()) as RolNombre[];
      }
    }
    
    console.log('Roles extraídos:', roles);
    return roles;
  };

  useEffect(() => {
    const tokenAlmacenado = localStorage.getItem('token');
    if (tokenAlmacenado) {
      try {
        console.log('Decodificando token almacenado...');
        const decodificado = jwtDecode<TokenDecodificado>(tokenAlmacenado);
        console.log('Token decodificado:', decodificado);
        
        const tiempoActual = Date.now() / 1000;
        
        if (decodificado.exp && decodificado.exp < tiempoActual) {
          console.log('Token expirado, eliminando...');
          localStorage.removeItem('token');
          setToken(null);
          setAuthToken(null);
          setUsuario(null);
        } else {
          console.log('Token válido, estableciendo usuario...');
          setToken(tokenAlmacenado);
          setAuthToken(tokenAlmacenado); // Actualizar el token en apiClient
          
          // Obtener el nombre de usuario
          const nombreUsuario = decodificado.sub;
          
          // Extraer roles del token
          const rolesUsuario = extraerRolesDelToken(decodificado);
          
          console.log(`Usuario ${nombreUsuario} con roles:`, rolesUsuario);
          
          setUsuario({
            usuario: nombreUsuario,
            roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
          });
        }
      } catch (error) {
        console.error('Error al decodificar token:', error);
        localStorage.removeItem('token');
        setToken(null);
        setAuthToken(null);
        setUsuario(null);
      }
    }
    setCargando(false);
  }, []);

  // Configurar el interceptor de axios para el token
  useEffect(() => {
    console.log('Configurando interceptor de axios con token:', token ? 'Presente' : 'Ausente');
    
    // Actualizar el token en apiClient
    setAuthToken(token);
    
    // Si hay un interceptor previo, eliminarlo primero
    if (interceptorRef.current !== null) {
      axios.interceptors.request.eject(interceptorRef.current);
      interceptorRef.current = null;
    }
    
    // Crear nuevo interceptor
    interceptorRef.current = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Añadiendo token a la solicitud');
        }
        return config;
      },
      (error) => {
        console.error('Error en interceptor de solicitud:', error);
        return Promise.reject(error);
      }
    );

    // También agregar un interceptor de respuesta para manejar errores de autenticación
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          console.warn('Respuesta 401 recibida, token inválido o expirado');
          // No llamar cerrarSesion() directamente aquí para evitar ciclos infinitos
          localStorage.removeItem('token');
          setToken(null);
          setAuthToken(null);
          setUsuario(null);
          // Redirigir a login solo si no estamos ya en la página de login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Función de limpieza
    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);  const iniciarSesion = async (credenciales: CredencialesLogin): Promise<boolean> => {
    try {
      setError(null);
      setCargando(true);
      console.log('Iniciando sesión con:', { usuario: credenciales.usuario });
      
      const respuesta = await apiAxios.post<RespuestaAutenticacion>(
        RUTAS_AUTENTICACION.INICIAR_SESION, 
        {
          usuario: credenciales.usuario,
          clave: credenciales.clave
        }
      );
      
      console.log('Respuesta de autenticación:', respuesta.data);
      const { jwt, status } = respuesta.data;
      
      if (jwt && status) {
        localStorage.setItem('token', jwt);
        setToken(jwt);
        setAuthToken(jwt); // Actualizar el token en apiClient
        
        try {
          const decodificado = jwtDecode<TokenDecodificado>(jwt);
          const nombreUsuario = decodificado.sub;
          
          // Extraer roles del token usando la función mejorada
          const rolesUsuario = extraerRolesDelToken(decodificado);
          
          console.log(`Usuario ${nombreUsuario} autenticado con roles:`, rolesUsuario);
          
          setUsuario({
            usuario: nombreUsuario,
            roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
          });
          
          return true;
        } catch (error) {
          console.error('Error al decodificar token:', error);
          setError('Error al procesar el token recibido');
          return false;
        }
      }
      
      setError('No se recibió un token válido');
      return false;
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      setError(error.response?.data?.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    console.log('Cerrando sesión, eliminando token...');
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null); // Limpiar el token en apiClient
    setUsuario(null);
  };

  const tieneRol = (rol: RolNombre): boolean => {
    if (!usuario || !usuario.roles || usuario.roles.length === 0) {
      console.log(`Verificando rol ${rol}: usuario sin roles`);
      return false;
    }
    
    const tieneElRol = usuario.roles.some(r => r.nombreRol === rol);
    console.log(`Verificando rol ${rol}:`, tieneElRol ? 'SÍ lo tiene' : 'NO lo tiene');
    
    return tieneElRol;
  };

  const valor: ContextoAutenticacion = {
    usuario,
    cargando,
    error,
    iniciarSesion,
    cerrarSesion,
    tieneRol,
  };

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
};