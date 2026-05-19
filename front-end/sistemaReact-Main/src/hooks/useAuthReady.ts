import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook personalizado que espera a que la autenticación esté completamente inicializada
 * antes de permitir que los componentes hagan llamadas al API.
 * 
 * Esto resuelve el problema de condiciones de carrera al recargar la página,
 * donde los componentes intentan cargar datos antes de que el token JWT
 * sea validado y establecido correctamente.
 */
export const useAuthReady = () => {
  const { cargando, usuario } = useAuth();
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;
  const [isReady, setIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // La autenticación está lista cuando:
    // 1. Ya no está cargando
    // 2. Y se cumple una de estas condiciones:
    //    - Hay un usuario autenticado (token válido)
    //    - No hay token en localStorage (usuario no autenticado)
    const tokenEnStorage = localStorage.getItem('token');

    if (!cargando) {
      if (tokenEnStorage && usuario) {
        // Usuario autenticado con token válido
        console.log('✅ Autenticación lista: Usuario autenticado');
        setIsReady(true);
        setAuthChecked(true);
      } else if (!tokenEnStorage) {
        // No hay token, usuario no autenticado (redirigir a login)
        console.log('⚠️  Autenticación lista: No hay token, usuario no autenticado');
        setIsReady(true);
        setAuthChecked(true);
      } else if (tokenEnStorage && !usuario) {
        // Hay token pero no usuario, el token podría ser inválido
        console.log('🔄 Esperando validación de token...');
        const timeoutId = setTimeout(() => {
          const stillHasToken = localStorage.getItem('token');
          // usuarioRef evita cierre obsoleto: si el AuthProvider ya hidrató al usuario, no borrar el token
          if (stillHasToken && !usuarioRef.current) {
            console.log('❌ Token sin sesión en contexto, limpiando localStorage');
            localStorage.removeItem('token');
          }
          setIsReady(true);
          setAuthChecked(true);
        }, 2000);

        // Cleanup timeout on unmount or re-run
        return () => clearTimeout(timeoutId);
      }
    }
  }, [cargando, usuario]);

  return {
    isReady,
    isAuthenticated: !!usuario,
    user: usuario,
    loading: cargando || !authChecked
  };
};
