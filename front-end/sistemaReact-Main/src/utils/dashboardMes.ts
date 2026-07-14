import type { Venta } from '@/types/Venta';
import type { MesRef } from '@/utils/reportesCompararMeses';
import {
  mesActual,
  mesAnteriorA,
  metricasDesdeVentasEnRango,
  pctCrecimientoComparar,
  rangoMesCalendario,
} from '@/utils/reportesCompararMeses';
import { getBottomNByUnits, getTopNByUnits } from '@/utils/reportProductRank';

export type DashboardModoMes = 'actual' | 'comparar';

const STORAGE_KEY = 'dashboard-home-modo-mes';

export function leerModoCompararMes(): DashboardModoMes {
  if (typeof window === 'undefined') return 'actual';
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw === 'comparar' ? 'comparar' : 'actual';
}

export function guardarModoCompararMes(modo: DashboardModoMes): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, modo);
}

export function formatDeltaPct(pct: number | null, compareOn: boolean): string | null {
  if (!compareOn || pct === null || Number.isNaN(pct)) return null;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export interface PuntoRitmoDiario {
  dia: number;
  label: string;
  actual: number;
  anterior?: number;
}

export function serieRitmoDiario(
  ventasActual: Venta[],
  mes: MesRef,
  hoy = new Date(),
  ventasAnterior?: Venta[],
  mesAnt?: MesRef
): PuntoRitmoDiario[] {
  const { fin } = rangoMesCalendario(mes, hoy);
  const lastDay = fin.getDate();

  const sumByDay = (ventas: Venta[], year: number, month: number) => {
    const map = new Map<number, number>();
    for (const v of ventas) {
      const f = new Date(v.fechaVenta);
      if (Number.isNaN(f.getTime())) continue;
      if (f.getFullYear() !== year || f.getMonth() + 1 !== month) continue;
      const d = f.getDate();
      map.set(d, (map.get(d) ?? 0) + (v.totalVentas ?? 0));
    }
    return map;
  };

  const mapAct = sumByDay(ventasActual, mes.year, mes.month);
  const mapAnt =
    ventasAnterior && mesAnt
      ? sumByDay(ventasAnterior, mesAnt.year, mesAnt.month)
      : null;

  const puntos: PuntoRitmoDiario[] = [];
  for (let dia = 1; dia <= lastDay; dia++) {
    const p: PuntoRitmoDiario = {
      dia,
      label: String(dia),
      actual: mapAct.get(dia) ?? 0,
    };
    if (mapAnt) p.anterior = mapAnt.get(dia) ?? 0;
    puntos.push(p);
  }
  return puntos;
}

export interface KpisDashboardMes {
  totalVentas: number;
  productosVendidos: number;
  ticketPromedio: number;
  clientesActivos: number;
  deltas: {
    totalVentas: number | null;
    productosVendidos: number | null;
    ticketPromedio: number | null;
    clientesActivos: number | null;
  } | null;
}

export function kpisDashboardMes(
  ventasPool: Venta[],
  mes: MesRef,
  hoy = new Date(),
  compareOn = false,
  mesAntRef?: MesRef
): KpisDashboardMes {
  const rango = rangoMesCalendario(mes, hoy);
  const m = metricasDesdeVentasEnRango(ventasPool, rango);
  const base: KpisDashboardMes = {
    totalVentas: m.totalVentas,
    productosVendidos: m.productosVendidos,
    ticketPromedio: m.ticketPromedio,
    clientesActivos: m.clientesActivos,
    deltas: null,
  };
  if (!compareOn) return base;

  const ant = mesAntRef ?? mesAnteriorA(mes);
  const rangoAnt = rangoMesCalendario(ant, hoy);
  const mAnt = metricasDesdeVentasEnRango(ventasPool, rangoAnt);

  const deltaOrNull = (actual: number, anterior: number): number | null => {
    if (anterior === 0) return null;
    return pctCrecimientoComparar(actual, anterior);
  };

  return {
    ...base,
    deltas: {
      totalVentas: deltaOrNull(m.totalVentas, mAnt.totalVentas),
      productosVendidos: deltaOrNull(m.productosVendidos, mAnt.productosVendidos),
      ticketPromedio: deltaOrNull(m.ticketPromedio, mAnt.ticketPromedio),
      clientesActivos: deltaOrNull(m.clientesActivos, mAnt.clientesActivos),
    },
  };
}

export interface VarianteRankItem {
  id: number;
  label: string;
  unidades: number;
  ingresos: number;
}

type RankRow = VarianteRankItem & { cantidadVendida: number; ingresosTotales: number };

export function rankVariantesDesdeVentas(
  ventas: Venta[],
  n = 5
): { top: VarianteRankItem[]; bottom: VarianteRankItem[] } {
  const map = new Map<number, RankRow>();
  for (const v of ventas) {
    for (const d of v.detalles ?? []) {
      const pv = d.productoVariante;
      const id = pv?.idProductoVariante ?? pv?.idVariante;
      if (id == null) continue;
      const nombre = pv.producto?.nombre ?? pv.nombre ?? 'Producto';
      const color = pv.color?.nombre ?? '—';
      const talla = pv.talla?.nombreTalla ?? '—';
      const prev = map.get(id) ?? {
        id,
        label: `${nombre} · ${color} · ${talla}`,
        unidades: 0,
        ingresos: 0,
        cantidadVendida: 0,
        ingresosTotales: 0,
      };
      const unidades = (d.cantidad ?? 0);
      const ingresos = d.subtotal ?? unidades * (d.precioUnitario ?? 0);
      prev.unidades += unidades;
      prev.ingresos += ingresos;
      prev.cantidadVendida = prev.unidades;
      prev.ingresosTotales = prev.ingresos;
      map.set(id, prev);
    }
  }

  const items = Array.from(map.values());
  const strip = (rows: RankRow[]): VarianteRankItem[] =>
    rows.map(({ id, label, unidades, ingresos }) => ({ id, label, unidades, ingresos }));

  return {
    top: strip(getTopNByUnits(items, n)),
    bottom: strip(getBottomNByUnits(items, n)),
  };
}

export function ultimasNVentas(ventas: Venta[], n = 10): Venta[] {
  return [...(ventas ?? [])]
    .filter((v) => v?.fechaVenta)
    .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
    .slice(0, n);
}

export function etiquetaMetodoPago(metodo: Venta['metodoPago']): string {
  if (typeof metodo === 'string') return metodo;
  if (metodo && typeof metodo === 'object') {
    return metodo.nombre || metodo.tipo || '—';
  }
  return '—';
}

export function deltaToneFromPct(pct: number | null): 'up' | 'down' | 'flat' {
  if (pct === null || pct === 0) return 'flat';
  return pct > 0 ? 'up' : 'down';
}

export { mesActual, mesAnteriorA, rangoMesCalendario };
