export type SyncTrigger = string | string[];

export function normalizeTriggers(triggers: SyncTrigger): Set<string> {
  const list = Array.isArray(triggers) ? triggers : [triggers];
  return new Set(list);
}

export interface WebSocketSyncMessage {
  type?: string;
  [key: string]: unknown;
}

/**
 * Indica si algún mensaje nuevo coincide con los triggers configurados.
 */
export function hasRelevantSyncMessage(
  newMessages: WebSocketSyncMessage[],
  triggerSet: Set<string>
): boolean {
  return newMessages.some((msg) => msg.type != null && triggerSet.has(msg.type));
}

/**
 * Decide si debe ejecutarse onSync tras eventos WS, respetando debounce.
 * Devuelve el nuevo timestamp de última sync si procede ejecutar.
 */
export function shouldRunDebouncedSync(
  lastSyncAt: number,
  debounceMs: number,
  now: number = Date.now()
): { run: boolean; nextLastSyncAt: number } {
  if (now - lastSyncAt < debounceMs) {
    return { run: false, nextLastSyncAt: lastSyncAt };
  }
  return { run: true, nextLastSyncAt: now };
}

/**
 * Procesa un lote de mensajes WS: devuelve los nuevos y si alguno es relevante.
 */
export function sliceUnprocessedMessages<T>(
  allMessages: T[],
  processedCount: number
): { newMessages: T[]; nextProcessedCount: number } {
  if (allMessages.length <= processedCount) {
    return { newMessages: [], nextProcessedCount: processedCount };
  }
  return {
    newMessages: allMessages.slice(processedCount),
    nextProcessedCount: allMessages.length,
  };
}
