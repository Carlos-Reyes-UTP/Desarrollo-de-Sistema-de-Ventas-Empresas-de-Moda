import type { ProductoVariante } from '../types/ProductoVariante';
import type { Talla } from '../types/Talla';
import type { Color } from '../types/Color';

/** Nombres únicos no vacíos, ordenados alfabéticamente (insensible a mayúsculas). */
export function nombresUnicosOrdenados(valores: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const v of valores) {
    const t = (v ?? '').trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function collectTallaNamesFromVariantes(variantes: ProductoVariante[]): string[] {
  return nombresUnicosOrdenados(variantes.map((v) => v.talla?.nombreTalla));
}

export function collectColorNamesFromVariantes(variantes: ProductoVariante[]): string[] {
  return nombresUnicosOrdenados(variantes.map((v) => v.color?.nombre));
}

export function tallaDesdeNombre(nombreTalla: string): Talla {
  return { nombreTalla: nombreTalla.trim() };
}

export function colorDesdeNombre(nombre: string, codigoHex?: string): Color {
  const n = nombre.trim();
  let hex = codigoHex?.trim();
  if (hex && !hex.startsWith('#')) hex = `#${hex}`;
  return { nombre: n, codigoHex: hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : '#CCCCCC' };
}

export function mismoParTallaColor(
  a: { nombreTalla: string; nombreColor: string },
  b: { nombreTalla: string; nombreColor: string }
): boolean {
  return (
    a.nombreTalla.trim().toLowerCase() === b.nombreTalla.trim().toLowerCase() &&
    a.nombreColor.trim().toLowerCase() === b.nombreColor.trim().toLowerCase()
  );
}
