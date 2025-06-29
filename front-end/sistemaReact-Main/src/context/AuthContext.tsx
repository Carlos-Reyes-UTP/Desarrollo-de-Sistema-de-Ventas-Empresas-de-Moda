import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import type { Usuario, Rol } from '../interfaces/Usuario';
import type { CredencialesLogin, RespuestaAutenticacion } from '../interfaces/Usuario';
import type { RolNombre } from '../interfaces/enums';
import { RUTAS_AUTENTICACION } from '../config/apiConfig';
import { setAuthToken } from '../config/apiClient';

interface TokenDecodificado {
  sub: string;
  authorities?: string[] | string;
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
    
    console.log('🔍 Extracting roles from token authorities:', decodificado.authorities);
    
    if (decodificado.authorities) {
      if (Array.isArray(decodificado.authorities)) {
        console.log('📋 Authorities is array:', decodificado.authorities);
        roles = decodificado.authorities as RolNombre[];
      } else if (typeof decodificado.authorities === 'string') {
        console.log('🔤 Authorities is string:', decodificado.authorities);        // Puede venir como "ADMIN" o "ROLE_ADMIN" o "ADMIN,CAJERO"
        const autoritiesStr = decodificado.authorities;
        roles = autoritiesStr.split(',').map(rol => {
          const cleanRole = rol.trim();
          // Si NO viene con prefijo ROLE_, lo agregamos
          return cleanRole.startsWith('ROLE_') ? cleanRole : `ROLE_${cleanRole}`;
        }) as RolNombre[];
      }
    }
    
    console.log('✅ Final extracted roles:', roles);
    return roles;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const tokenAlmacenado = localStorage.getItem('token');
      if (tokenAlmacenado) {
        try {
          const decodificado = jwtDecode<TokenDecodificado>(tokenAlmacenado);
          const tiempoActual = Date.now() / 1000;
          
          if (decodificado.exp && decodificado.exp < tiempoActual) {
            localStorage.removeItem('token');
          } else {
            setToken(tokenAlmacenado);
            setAuthToken(tokenAlmacenado);
            
            const nombreUsuario = decodificado.sub;
            const rolesUsuario = extraerRolesDelToken(decodificado);
            
            setUsuario({
              usuario: nombreUsuario,
              roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
            });
          }
        } catch (error) {
          console.error('Error al decodificar token:', error);
          localStorage.removeItem('token');
        }
      }
      setCargando(false);
    };
    
    initializeAuth();
  }, []);  // Configurar interceptores una sola vez al montar el componente
  useEffect(() => {
    if (interceptorRef.current !== null) {
      axios.interceptors.request.eject(interceptorRef.current);
      interceptorRef.current = null;
    }
    
    interceptorRef.current = axios.interceptors.request.use(
      (config) => {
        // Obtener token directamente del localStorage para evitar dependencias
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
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
          // Usar callback para evitar dependencias circulares
          localStorage.removeItem('token');
          
          // Actualizar estados usando callbacks
          setToken(null);
          setAuthToken(null);
          setUsuario(null);
          
          if (window.location.pathname !== '/login') {
            // Redirigir después de un pequeño delay para evitar problemas de estado
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup al desmontar
    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.request.eject(interceptorRef.current);
      }
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []); // Sin dependencias para evitar bucle infinito

  // Efecto separado para sincronizar el token cuando cambie
  useEffect(() => {
    setAuthToken(token);
  }, [token]);  const iniciarSesion = useCallback(async (credenciales: CredencialesLogin): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔄 Intentando iniciar sesión con:', { usuario: credenciales.usuario });
      
      const response = await axios.post<RespuestaAutenticacion>(
        RUTAS_AUTENTICACION.INICIAR_SESION,
        credenciales
      );

      console.log('✅ Respuesta del servidor:', response.data);
      
      const { jwt: nuevoToken } = response.data;
      localStorage.setItem('token', nuevoToken);
      
      const decodificado = jwtDecode<TokenDecodificado>(nuevoToken);
      console.log('🔍 Token decodificado:', decodificado);
      
      const nombreUsuario = decodificado.sub;
      const rolesUsuario = extraerRolesDelToken(decodificado);
      
      console.log('👤 Usuario:', nombreUsuario);
      console.log('🔐 Roles extraídos:', rolesUsuario);
      console.log('🎯 Authorities en token:', decodificado.authorities);
      
      setToken(nuevoToken);
      setAuthToken(nuevoToken);
      setUsuario({
        usuario: nombreUsuario,
        roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
      });

      console.log('✅ Usuario autenticado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en inicio de sesión:', error);
      setError('Credenciales inválidas');
      return false;
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setUsuario(null);
    window.location.href = '/login';
  }, []);  const tieneRol = useCallback((rol: RolNombre): boolean => {
    if (!usuario?.roles) return false;
    
    // Los roles se almacenan como array de objetos Rol con { nombreRol: RolNombre }
    return (usuario.roles as Rol[]).some(r => r.nombreRol === rol);
  }, [usuario?.roles]);

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