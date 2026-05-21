import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leerSesionDesdeStorage } from '@/utils/authBootstrap';

const sesionInicial = leerSesionDesdeStorage();

/**
 * Indica cuándo es seguro llamar APIs autenticadas.
 * La UI no debe bloquearse en pantallas completas de carga: el layout ya valida sesión.
 */
export const useAuthReady = () => {
  const { cargando, usuario } = useAuth();
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;
  const [isReady, setIsReady] = useState(
    () => !localStorage.getItem('token') || !!sesionInicial.usuario
  );

  useEffect(() => {
    const tokenEnStorage = localStorage.getItem('token');

    if (!cargando) {
      if (tokenEnStorage && usuario) {
        setIsReady(true);
      } else if (!tokenEnStorage) {
        setIsReady(true);
      } else if (tokenEnStorage && !usuario) {
        const timeoutId = setTimeout(() => {
          const stillHasToken = localStorage.getItem('token');
          if (stillHasToken && !usuarioRef.current) {
            localStorage.removeItem('token');
          }
          setIsReady(true);
        }, 400);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [cargando, usuario]);

  return {
    isReady,
    isAuthenticated: !!usuario,
    user: usuario,
    loading: cargando || (!isReady && !!localStorage.getItem('token')),
  };
};
