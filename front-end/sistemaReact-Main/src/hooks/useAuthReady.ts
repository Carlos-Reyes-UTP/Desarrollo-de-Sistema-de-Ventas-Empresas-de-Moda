import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
        setTimeout(() => {
          // Si después de un tiempo aún no hay usuario, considerar que el token es inválido
          if (!usuario) {
            console.log('❌ Token inválido, limpiando localStorage');
            localStorage.removeItem('token');
            setIsReady(true);
            setAuthChecked(true);
          }
        }, 2000); // Esperar 2 segundos para validación de token
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
