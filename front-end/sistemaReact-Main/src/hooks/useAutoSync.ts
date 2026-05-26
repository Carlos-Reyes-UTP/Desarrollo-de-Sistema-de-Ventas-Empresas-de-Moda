import { useEffect, useRef } from 'react';
import { useGlobalWebSocket } from '../context/WebSocketContext';

type SyncTrigger = string | string[];

/**
 * Escucha mensajes WebSocket y dispara la función de recarga automáticamente
 * cuando llega un mensaje cuyo `type` coincide con los triggers configurados.
 *
 * @param onSync - Función a ejecutar cuando se recibe un evento relevante
 * @param triggers - Tipo(s) de mensaje que disparan el sync (ej: 'NUEVA_VENTA', 'SOLICITUD_CREADA')
 * @param debounceMs - Tiempo mínimo entre ejecuciones para evitar ráfagas (default: 1000ms)
 */
export function useAutoSync(
  onSync: () => void | Promise<void>,
  triggers: SyncTrigger,
  debounceMs: number = 1000
) {
  const { messages } = useGlobalWebSocket();
  const lastSyncRef = useRef<number>(0);
  const triggerSet = useRef<Set<string>>(new Set());
  const processedCountRef = useRef<number>(0);

  useEffect(() => {
    const list = Array.isArray(triggers) ? triggers : [triggers];
    triggerSet.current = new Set(list);
  }, [triggers]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length <= processedCountRef.current) return;

    const newMessages = messages.slice(processedCountRef.current);
    processedCountRef.current = messages.length;

    const hasRelevant = newMessages.some(
      (msg: any) => msg.type && triggerSet.current.has(msg.type)
    );

    if (!hasRelevant) return;

    const now = Date.now();
    if (now - lastSyncRef.current < debounceMs) return;

    lastSyncRef.current = now;
    onSync();
  }, [messages, onSync, debounceMs]);
}
