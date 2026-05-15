import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../config/apiClient';
import type { Usuario, Rol } from '../types/Usuario';
import type { CredencialesLogin, RespuestaAutenticacion } from '../types/Usuario';
import type { RolNombre } from '../types/enums';
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
    console.log('🔍 Inicializando autenticación');
    const initializeAuth = async () => {
      const tokenAlmacenado = localStorage.getItem('token');
      console.log('📦 Token almacenado:', tokenAlmacenado);

      if (tokenAlmacenado) {
        try {
          const decodificado = jwtDecode<TokenDecodificado>(tokenAlmacenado);
          console.log('🔓 Token decodificado:', decodificado);

          const tiempoActual = Date.now() / 1000;
          console.log('⏰ Tiempo actual:', tiempoActual, 'Expiración del token:', decodificado.exp);

          if (decodificado.exp && decodificado.exp < tiempoActual) {
            console.log('❌ Token expirado, eliminando del almacenamiento');
            localStorage.removeItem('token');
          } else {
            setToken(tokenAlmacenado);
            setAuthToken(tokenAlmacenado);

            const nombreUsuario = decodificado.sub;
            const rolesUsuario = extraerRolesDelToken(decodificado);

            console.log('👤 Usuario:', nombreUsuario, 'Roles:', rolesUsuario);

            setUsuario({
              usuario: nombreUsuario,
              roles: rolesUsuario.map(rol => ({ nombreRol: rol }))
            });
          }
        } catch (error) {
          console.error('⚠️ Error al decodificar token:', error);
          localStorage.removeItem('token');
        }
      }
      setCargando(false);
    };

    initializeAuth();
  }, []);

  // Efecto separado para sincronizar el token cuando cambie
  useEffect(() => {
    setAuthToken(token);
  }, [token]);  const iniciarSesion = useCallback(async (credenciales: CredencialesLogin): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔄 Intentando iniciar sesión con:', { usuario: credenciales.usuario });
      
      const response = await apiClient.post<RespuestaAutenticacion>(
        '/api/autenticacion/signin',
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