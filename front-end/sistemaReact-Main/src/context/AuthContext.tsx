import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient, { setAuthToken } from '../config/apiClient';
import type { Usuario, CredencialesLogin, RespuestaAutenticacion } from '../types/Usuario';
import type { RolNombre } from '../types/enums';
import type { TokenDecodificado } from '../types/TokenDecodificado';
import { leerSesionDesdeStorage } from '@/utils/authBootstrap';
import { MaterialIcon, ModalPortal, useModalBodyScrollLock } from '@/shared/ui';

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

// eslint-disable-next-line react-refresh/only-export-components
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
  const [avisoSesionExpirada, setAvisoSesionExpirada] = useState<{
    open: boolean;
    mensaje: string;
    segundos: number;
  }>({
    open: false,
    mensaje: '',
    segundos: 3,
  });

  const expiracionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiracionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useModalBodyScrollLock(avisoSesionExpirada.open);
  
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

  const limpiarTemporizadoresSesion = useCallback(() => {
    if (expiracionTimeoutRef.current) {
      clearTimeout(expiracionTimeoutRef.current);
      expiracionTimeoutRef.current = null;
    }

    if (expiracionIntervalRef.current) {
      clearInterval(expiracionIntervalRef.current);
      expiracionIntervalRef.current = null;
    }
  }, []);

  const cerrarSesionConAviso = useCallback(() => {
    limpiarTemporizadoresSesion();
    setAvisoSesionExpirada({ open: false, mensaje: '', segundos: 3 });
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setUsuario(null);
    globalThis.location.href = '/login';
  }, [limpiarTemporizadoresSesion]);

  const mostrarAvisoSesionExpirada = useCallback((mensaje: string) => {
    limpiarTemporizadoresSesion();
    setAvisoSesionExpirada({ open: true, mensaje, segundos: 3 });

    let segundosRestantes = 3;
    expiracionIntervalRef.current = setInterval(() => {
      segundosRestantes -= 1;

      if (segundosRestantes <= 0) {
        limpiarTemporizadoresSesion();
        setAvisoSesionExpirada({ open: false, mensaje: '', segundos: 3 });
        cerrarSesionConAviso();
        return;
      }

      setAvisoSesionExpirada((prev) => ({ ...prev, segundos: segundosRestantes }));
    }, 1000);
  }, [cerrarSesionConAviso, limpiarTemporizadoresSesion]);

  const programarAvisoExpiracion = useCallback((tokenActual: string | null) => {
    limpiarTemporizadoresSesion();
    setAvisoSesionExpirada({ open: false, mensaje: '', segundos: 3 });

    if (!tokenActual) {
      return;
    }

    try {
      const decodificado = jwtDecode<TokenDecodificado>(tokenActual);
      const tiempoActual = Date.now();

      if (!decodificado.exp) {
        return;
      }

      const tiempoExpiracion = decodificado.exp * 1000;
      const tiempoRestante = tiempoExpiracion - tiempoActual;

      if (tiempoRestante <= 0) {
        mostrarAvisoSesionExpirada('Tu sesión ha expirado. Debes volver a iniciar sesión.');
        return;
      }

      expiracionTimeoutRef.current = setTimeout(() => {
        mostrarAvisoSesionExpirada('Tu sesión ha expirado. Debes volver a iniciar sesión.');
      }, tiempoRestante);
    } catch (error_) {
      console.error('Error al programar expiración de sesión:', error_);
    }
  }, [limpiarTemporizadoresSesion, mostrarAvisoSesionExpirada]);

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

  useEffect(() => {
    programarAvisoExpiracion(token);

    return () => {
      limpiarTemporizadoresSesion();
    };
  }, [token, programarAvisoExpiracion, limpiarTemporizadoresSesion]);

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
    cerrarSesionConAviso();
  }, [cerrarSesionConAviso]);

  const tieneRol = useCallback((rol: RolNombre): boolean => {
    if (!usuario?.roles) return false;
    
    // Los roles se almacenan como array de objetos Rol con { nombreRol: RolNombre }
    return usuario.roles.some(r => r.nombreRol === rol);
  }, [usuario?.roles]);

  const valorContexto = useMemo(
    () => ({
      usuario,
      cargando,
      error,
      iniciarSesion,
      cerrarSesion,
      tieneRol,
    }),
    [usuario, cargando, error, iniciarSesion, cerrarSesion, tieneRol]
  );

  return (
    <ContextoAuth.Provider
      value={valorContexto}
    >
      {children}

      {avisoSesionExpirada.open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-955 shadow-2xl overflow-hidden animate-scaleIn">
              <div className="px-8 pt-8 pb-4 flex items-center gap-4 bg-[var(--app-surface)]">
                <div className="w-11 h-11 rounded-2xl bg-[var(--app-bg-muted)] flex items-center justify-center text-[var(--app-accent)]">
                  <MaterialIcon icon="warning" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--app-text)] uppercase tracking-tight leading-tight">
                    Sesión expirada
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-[var(--app-text-muted)]">
                    {avisoSesionExpirada.mensaje}
                  </p>
                </div>
              </div>

              <div className="px-8 py-6 space-y-4 bg-[var(--app-surface)]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                  <span>Redirigiendo</span>
                  <span>{avisoSesionExpirada.segundos}s</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-850 overflow-hidden">
                  <div
                    className="h-full bg-[var(--app-accent)] transition-all duration-1000 ease-linear"
                    style={{ width: `${(avisoSesionExpirada.segundos / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ContextoAuth.Provider>
  );
};