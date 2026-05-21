import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../config/apiClient';
import type { Usuario, Rol } from '../types/Usuario';
import type { CredencialesLogin, RespuestaAutenticacion } from '../types/Usuario';
import type { RolNombre } from '../types/enums';
import type { TokenDecodificado } from '../types/TokenDecodificado';
import { setAuthToken } from '../config/apiClient';
import { leerSesionDesdeStorage } from '@/utils/authBootstrap';

const sesionInicial = leerSesionDesdeStorage();
if (sesionInicial.token) {
  setAuthToken(sesionInicial.token);
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
  const [usuario, setUsuario] = useState<Usuario | null>(sesionInicial.usuario);
  const [token, setToken] = useState<string | null>(sesionInicial.token);
  const [cargando, setCargando] = useState(false);
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
    const sesion = leerSesionDesdeStorage();
    setToken(sesion.token);
    setUsuario(sesion.usuario);
    setAuthToken(sesion.token);
  }, []);

  // Efecto separado para sincronizar el token cuando cambie
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const iniciarSesion = useCallback(async (credenciales: CredencialesLogin): Promise<boolean> => {
    setCargando(true);
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
    } finally {
      setCargando(false);
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setUsuario(null);
    window.location.href = '/login';
  }, []);

  const tieneRol = useCallback((rol: RolNombre): boolean => {
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