import { useCallback, useEffect, useRef } from 'react';
import { useGlobalWebSocket } from '../context/WebSocketContext';
import {
  hasRelevantSyncMessage,
  normalizeTriggers,
  shouldRunDebouncedSync,
  sliceUnprocessedMessages,
  type SyncTrigger,
  type WebSocketSyncMessage,
} from './syncTriggers';

export type { SyncTrigger };

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
  const { messages, isConnected } = useGlobalWebSocket();
  const lastSyncRef = useRef<number>(0);
  const triggerSetRef = useRef<Set<string>>(normalizeTriggers(triggers));
  const processedCountRef = useRef<number>(0);
  const onSyncRef = useRef(onSync);
  const wasConnectedRef = useRef(false);
  const hadDisconnectRef = useRef(false);

  onSyncRef.current = onSync;

  useEffect(() => {
    triggerSetRef.current = normalizeTriggers(triggers);
  }, [triggers]);

  const runSyncIfDebounced = useCallback(() => {
    const { run, nextLastSyncAt } = shouldRunDebouncedSync(
      lastSyncRef.current,
      debounceMs
    );
    if (!run) return;
    lastSyncRef.current = nextLastSyncAt;
    void onSyncRef.current();
  }, [debounceMs]);

  useEffect(() => {
    if (!isConnected) {
      if (wasConnectedRef.current) {
        hadDisconnectRef.current = true;
      }
      wasConnectedRef.current = false;
      return;
    }

    if (hadDisconnectRef.current) {
      hadDisconnectRef.current = false;
      runSyncIfDebounced();
    }
    wasConnectedRef.current = true;
  }, [isConnected, runSyncIfDebounced]);

  useEffect(() => {
    if (messages.length === 0) return;

    const { newMessages, nextProcessedCount } = sliceUnprocessedMessages(
      messages as WebSocketSyncMessage[],
      processedCountRef.current
    );
    processedCountRef.current = nextProcessedCount;

    if (newMessages.length === 0) return;

    if (!hasRelevantSyncMessage(newMessages, triggerSetRef.current)) return;

    runSyncIfDebounced();
  }, [messages, runSyncIfDebounced]);
}
