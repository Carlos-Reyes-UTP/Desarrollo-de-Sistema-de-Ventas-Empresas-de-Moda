/**
 * Convierte un valor desconocido a número de forma segura.
 *
 * @param v       - El valor a convertir (puede ser number, string, null, undefined…)
 * @param fallback - Valor de retorno si la conversión no es posible (default: 0)
 */
export function parseNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** @deprecated Usar `parseNumber` — alias de compatibilidad temporal */
export const num = parseNumber;
