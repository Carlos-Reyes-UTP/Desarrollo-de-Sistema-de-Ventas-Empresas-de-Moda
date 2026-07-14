import type { Venta } from '@/types/Venta';
import { filtrarVentasEnRango } from '@/utils/dashboardPeriodo';

/** Mes calendario: `month` es 1–12. */
export type MesRef = { year: number; month: number };

export type ModoReportePeriodo = 'rapido' | 'comparar';

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

export function mesActual(hoy = new Date()): MesRef {
  return { year: hoy.getFullYear(), month: hoy.getMonth() + 1 };
}

/** Mes calendario inmediatamente anterior a `ref`. */
export function mesAnteriorA(ref: MesRef): MesRef {
  if (ref.month === 1) return { year: ref.year - 1, month: 12 };
  return { year: ref.year, month: ref.month - 1 };
}

export function mismoMes(a: MesRef, b: MesRef): boolean {
  return a.year === b.year && a.month === b.month;
}

export function mesEsFuturo(ref: MesRef, hoy = new Date()): boolean {
  const y = hoy.getFullYear();
  const m = hoy.getMonth() + 1;
  return ref.year > y || (ref.year === y && ref.month > m);
}

export function etiquetaMesCorto(ref: MesRef): string {
  const nombre = MESES_CORTOS[ref.month - 1] ?? '???';
  return `${nombre} ${ref.year}`;
}

/** Capitaliza la etiqueta corta para UI: `Jun 2026`. */
export function etiquetaMesUi(ref: MesRef): string {
  const raw = etiquetaMesCorto(ref);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Rango inclusivo del mes. Si es el mes actual, `fin` es fin de hoy
 * (no incluye días futuros del mismo mes).
 */
export function rangoMesCalendario(ref: MesRef, hoy = new Date()): { inicio: Date; fin: Date } {
  const inicio = new Date(ref.year, ref.month - 1, 1, 0, 0, 0, 0);
  const finMes = new Date(ref.year, ref.month, 0, 23, 59, 59, 999);
  if (ref.year === hoy.getFullYear() && ref.month === hoy.getMonth() + 1) {
    const finHoy = new Date(hoy);
    finHoy.setHours(23, 59, 59, 999);
    return { inicio, fin: finHoy.getTime() < finMes.getTime() ? finHoy : finMes };
  }
  return { inicio, fin: finMes };
}

/** Delta = (comparar − base) / base. Base 0 y comparar > 0 → 100; ambos 0 → 0. */
export function pctCrecimientoComparar(comparar: number, base: number): number {
  if (base === 0) return comparar > 0 ? 100 : 0;
  return ((comparar - base) / base) * 100;
}

export interface MetricasMes {
  totalVentas: number;
  totalOrdenes: number;
  ticketPromedio: number;
  clientesActivos: number;
  productosVendidos: number;
}

export function metricasDesdeVentasEnRango(
  ventas: Venta[],
  rango: { inicio: Date; fin: Date }
): MetricasMes {
  const filtradas = filtrarVentasEnRango(ventas, rango.inicio, rango.fin);
  const totalVentas = filtradas.reduce((s, v) => s + (v.totalVentas ?? 0), 0);
  const totalOrdenes = filtradas.length;
  const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
  const clientesActivos = new Set(
    filtradas.map((v) => v.cliente?.idCliente).filter((id) => id !== undefined)
  ).size;
  const productosVendidos = filtradas.reduce((sum, v) => {
    if (v.detalles?.length) return sum + v.detalles.reduce((d, det) => d + det.cantidad, 0);
    return sum;
  }, 0);
  return { totalVentas, totalOrdenes, ticketPromedio, clientesActivos, productosVendidos };
}

export type FormatoMetricaComparar = 'moneda' | 'entero';

export interface PuntoChartCompararMeses {
  metrica: string;
  /** Altura normalizada 0–100 (máx del par = 100). */
  base: number;
  comparar: number;
  baseRaw: number;
  compararRaw: number;
  formato: FormatoMetricaComparar;
}

export interface ResultadoCompararMeses {
  invalidSameMonth: boolean;
  base: MetricasMes;
  comparar: MetricasMes;
  deltas: {
    crecimientoVentas: number;
    crecimientoOrdenes: number;
    crecimientoTicket: number;
    crecimientoClientes: number;
    crecimientoProductos: number;
  };
  chartSerie: PuntoChartCompararMeses[];
  etiquetaBase: string;
  etiquetaComparar: string;
  insight: string;
}

function normPair(a: number, b: number): { base: number; comparar: number } {
  const m = Math.max(Math.abs(a), Math.abs(b), Number.EPSILON);
  return { base: (a / m) * 100, comparar: (b / m) * 100 };
}

function fraseDelta(pct: number): string {
  if (Math.abs(pct) < 0.05) return 'casi no cambió';
  if (pct > 0) return `subió ${pct.toFixed(1)}%`;
  return `bajó ${Math.abs(pct).toFixed(1)}%`;
}

export function compararMeses(
  ventas: Venta[],
  mesBase: MesRef,
  mesComparar: MesRef,
  hoy = new Date()
): ResultadoCompararMeses {
  const etiquetaBase = etiquetaMesUi(mesBase);
  const etiquetaComparar = etiquetaMesUi(mesComparar);

  if (mismoMes(mesBase, mesComparar)) {
    const vacio: MetricasMes = {
      totalVentas: 0,
      totalOrdenes: 0,
      ticketPromedio: 0,
      clientesActivos: 0,
      productosVendidos: 0,
    };
    return {
      invalidSameMonth: true,
      base: vacio,
      comparar: vacio,
      deltas: {
        crecimientoVentas: 0,
        crecimientoOrdenes: 0,
        crecimientoTicket: 0,
        crecimientoClientes: 0,
        crecimientoProductos: 0,
      },
      chartSerie: [],
      etiquetaBase,
      etiquetaComparar,
      insight: 'Elige dos meses distintos para comparar.',
    };
  }

  const rBase = rangoMesCalendario(mesBase, hoy);
  const rComp = rangoMesCalendario(mesComparar, hoy);
  const base = metricasDesdeVentasEnRango(ventas, rBase);
  const comparar = metricasDesdeVentasEnRango(ventas, rComp);

  const deltas = {
    crecimientoVentas: pctCrecimientoComparar(comparar.totalVentas, base.totalVentas),
    crecimientoOrdenes: pctCrecimientoComparar(comparar.totalOrdenes, base.totalOrdenes),
    crecimientoTicket: pctCrecimientoComparar(comparar.ticketPromedio, base.ticketPromedio),
    crecimientoClientes: pctCrecimientoComparar(comparar.clientesActivos, base.clientesActivos),
    crecimientoProductos: pctCrecimientoComparar(comparar.productosVendidos, base.productosVendidos),
  };

  const nIng = normPair(base.totalVentas, comparar.totalVentas);
  const nOrd = normPair(base.totalOrdenes, comparar.totalOrdenes);
  const nTic = normPair(base.ticketPromedio, comparar.ticketPromedio);

  const chartSerie: PuntoChartCompararMeses[] = [
    {
      metrica: 'Ingresos',
      base: nIng.base,
      comparar: nIng.comparar,
      baseRaw: base.totalVentas,
      compararRaw: comparar.totalVentas,
      formato: 'moneda',
    },
    {
      metrica: 'Ventas',
      base: nOrd.base,
      comparar: nOrd.comparar,
      baseRaw: base.totalOrdenes,
      compararRaw: comparar.totalOrdenes,
      formato: 'entero',
    },
    {
      metrica: 'Ticket',
      base: nTic.base,
      comparar: nTic.comparar,
      baseRaw: base.ticketPromedio,
      compararRaw: comparar.ticketPromedio,
      formato: 'moneda',
    },
  ];

  const insight = `En ingresos, al pasar de ${etiquetaBase} a ${etiquetaComparar}, el dinero ${fraseDelta(deltas.crecimientoVentas)}.`;

  return {
    invalidSameMonth: false,
    base,
    comparar,
    deltas,
    chartSerie,
    etiquetaBase,
    etiquetaComparar,
    insight,
  };
}

/** Clave estable para sessionStorage. */
export function mesRefToKey(ref: MesRef): string {
  return `${ref.year}-${String(ref.month).padStart(2, '0')}`;
}

export function mesRefFromKey(raw: string | null): MesRef | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

/** Lista de meses seleccionables: desde `desde` hasta el mes actual (inclusive), más recientes primero. */
export function listarMesesHastaHoy(mesesAtras = 24, hoy = new Date()): MesRef[] {
  const out: MesRef[] = [];
  let cur = mesActual(hoy);
  for (let i = 0; i < mesesAtras; i++) {
    out.push(cur);
    cur = mesAnteriorA(cur);
  }
  return out;
}
