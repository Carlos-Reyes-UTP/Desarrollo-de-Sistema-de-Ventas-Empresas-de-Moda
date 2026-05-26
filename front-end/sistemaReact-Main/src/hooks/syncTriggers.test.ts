import { describe, expect, it } from 'vitest';
import {
  hasRelevantSyncMessage,
  normalizeTriggers,
  shouldRunDebouncedSync,
  sliceUnprocessedMessages,
} from './syncTriggers';

describe('normalizeTriggers', () => {
  it('acepta un string único', () => {
    expect(normalizeTriggers('NUEVA_VENTA')).toEqual(new Set(['NUEVA_VENTA']));
  });

  it('acepta un array de strings', () => {
    expect(normalizeTriggers(['A', 'B'])).toEqual(new Set(['A', 'B']));
  });
});

describe('hasRelevantSyncMessage', () => {
  const triggers = normalizeTriggers(['SOLICITUD_CREADA', 'NUEVA_VENTA']);

  it('devuelve true si hay un type en triggers', () => {
    expect(
      hasRelevantSyncMessage([{ type: 'SOLICITUD_CREADA' }], triggers)
    ).toBe(true);
  });

  it('devuelve false si el type no está en triggers', () => {
    expect(
      hasRelevantSyncMessage([{ type: 'OTRO_EVENTO' }], triggers)
    ).toBe(false);
  });

  it('devuelve false si falta type', () => {
    expect(hasRelevantSyncMessage([{ message: 'hola' }], triggers)).toBe(false);
  });
});

describe('shouldRunDebouncedSync', () => {
  it('permite sync si pasó el debounce', () => {
    const result = shouldRunDebouncedSync(0, 1000, 1500);
    expect(result.run).toBe(true);
    expect(result.nextLastSyncAt).toBe(1500);
  });

  it('bloquea sync dentro del debounce', () => {
    const result = shouldRunDebouncedSync(1000, 800, 1200);
    expect(result.run).toBe(false);
    expect(result.nextLastSyncAt).toBe(1000);
  });
});

describe('sliceUnprocessedMessages', () => {
  it('devuelve solo mensajes nuevos', () => {
    const all = [{ type: 'A' }, { type: 'B' }, { type: 'C' }];
    const { newMessages, nextProcessedCount } = sliceUnprocessedMessages(all, 1);
    expect(newMessages).toEqual([{ type: 'B' }, { type: 'C' }]);
    expect(nextProcessedCount).toBe(3);
  });

  it('no devuelve nada si ya se procesó todo', () => {
    const { newMessages, nextProcessedCount } = sliceUnprocessedMessages(
      [{ type: 'A' }],
      1
    );
    expect(newMessages).toEqual([]);
    expect(nextProcessedCount).toBe(1);
  });
});
