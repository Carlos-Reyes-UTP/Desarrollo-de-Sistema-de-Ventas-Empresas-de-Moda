import type { AreaCatalogo, CombinacionFaltante, Piso } from '@/types/EstructuraAlmacen';

export function mensajeErrorApi(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: string | { message?: string } } };
  const data = ax.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return fallback;
}

export function etiquetaUbicacion(nombrePiso: string, nombreArea: string): string {
  return `${nombrePiso} · ${nombreArea}`;
}

export function parUbicacionKey(idUbicacion: number, idArea: number): string {
  return `${idUbicacion}:${idArea}`;
}

export function pisosDisponiblesParaCrear(
  faltantes: CombinacionFaltante[],
  pisos: Piso[],
  idArea?: number
): Piso[] {
  const ids = new Set(
    faltantes
      .filter((f) => !idArea || f.idArea === idArea)
      .map((f) => f.idUbicacion)
  );
  return pisos.filter((p) => ids.has(p.idUbicacion));
}

export function sectoresDisponiblesParaCrear(
  faltantes: CombinacionFaltante[],
  sectores: AreaCatalogo[],
  idUbicacion?: number
): AreaCatalogo[] {
  const ids = new Set(
    faltantes
      .filter((f) => !idUbicacion || f.idUbicacion === idUbicacion)
      .map((f) => f.idArea)
  );
  return sectores.filter((s) => ids.has(s.idArea));
}

export function parEsCreable(
  faltantes: CombinacionFaltante[],
  idUbicacion: number,
  idArea: number
): boolean {
  return faltantes.some((f) => f.idUbicacion === idUbicacion && f.idArea === idArea);
}

export function primerParFaltante(
  faltantes: CombinacionFaltante[]
): { idUbicacion: number; idArea: number } | null {
  const first = faltantes[0];
  if (!first) return null;
  return { idUbicacion: first.idUbicacion, idArea: first.idArea };
}
