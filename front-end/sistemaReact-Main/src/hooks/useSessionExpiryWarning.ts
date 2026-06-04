import { useEffect, useState, useCallback } from 'react';

interface SesionExpirandoDetail {
  minutosRestantes: number;
}

interface SesionExpirandoState {
  visible: boolean;
  minutosRestantes: number;
}

/**
 * Hook que escucha el evento global `session-expiring-soon` emitido por el
 * interceptor de Axios cuando el JWT está a punto de expirar.
 *
 * Retorna el estado del aviso y una función para descartarlo manualmente.
 *
 * Uso:
 * ```tsx
 * const { avisoVisible, minutosRestantes, descartar } = useSessionExpiryWarning();
 * ```
 */
export function useSessionExpiryWarning() {
  const [state, setState] = useState<SesionExpirandoState>({
    visible: false,
    minutosRestantes: 0,
  });

  const descartar = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<SesionExpirandoDetail>;
      setState({
        visible: true,
        minutosRestantes: custom.detail?.minutosRestantes ?? 5,
      });
    };

    window.addEventListener('session-expiring-soon', handler);
    return () => window.removeEventListener('session-expiring-soon', handler);
  }, []);

  return {
    avisoVisible: state.visible,
    minutosRestantes: state.minutosRestantes,
    descartar,
  };
}
