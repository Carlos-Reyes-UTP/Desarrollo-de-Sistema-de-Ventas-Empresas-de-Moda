import type { Venta } from '@/types/Venta';

export type PeriodoDashboard = 'hoy' | '7d' | '30d';

const STORAGE_KEY = 'dashboard-admin-periodo';

export interface PuntoGraficoDashboard {
  label: string;
  ventas: number;
  /** Número de transacciones (útil en gráfico por hora del día). */
  cantidadVentas?: number;
}

function medianocheHoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finHoy(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function leerPeriodoGuardado(): PeriodoDashboard {
  if (typeof window === 'undefined') return '7d';
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === 'hoy' || raw === '7d' || raw === '30d') return raw;
  return '7d';
}

export function guardarPeriodo(periodo: PeriodoDashboard): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, periodo);
  }
}

export function inicioPeriodo(periodo: PeriodoDashboard): Date {
  const inicio = medianocheHoy();
  if (periodo === 'hoy') return inicio;
  if (periodo === '7d') {
    inicio.setDate(inicio.getDate() - 6);
    return inicio;
  }
  inicio.setDate(inicio.getDate() - 29);
  return inicio;
}

export function etiquetaPeriodo(periodo: PeriodoDashboard): string {
  switch (periodo) {
    case 'hoy':
      return 'Hoy';
    case '7d':
      return 'Últimos 7 días';
    case '30d':
      return 'Últimos 30 días';
  }
}

export function tituloGraficoPeriodo(periodo: PeriodoDashboard): string {
  switch (periodo) {
    case 'hoy':
      return 'Ventas por hora';
    case '7d':
      return 'Ventas por día';
    case '30d':
      return 'Ventas por semana';
  }
}

export function subtituloGraficoPeriodo(periodo: PeriodoDashboard): string | null {
  if (periodo === 'hoy') {
    return 'Horas del día con ventas registradas';
  }
  return null;
}

function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

function procesarGraficoHoy(ventas: Venta[]): PuntoGraficoDashboard[] {
  const inicio = medianocheHoy();
  const fin = finHoy();
  const porHora = new Map<number, { total: number; count: number }>();

  for (const v of ventas) {
    const f = new Date(v.fechaVenta);
    if (Number.isNaN(f.getTime()) || f < inicio || f > fin) continue;
    const hora = f.getHours();
    const prev = porHora.get(hora) ?? { total: 0, count: 0 };
    porHora.set(hora, {
      total: prev.total + (v.totalVentas ?? 0),
      count: prev.count + 1,
    });
  }

  return Array.from(porHora.entries())
    .filter(([, data]) => data.total > 0)
    .sort(([a], [b]) => a - b)
    .map(([hora, data]) => ({
      label: etiquetaHora(hora),
      ventas: data.total,
      cantidadVentas: data.count,
    }));
}

export function ventaEnPeriodo(fechaVenta: string | Date, periodo: PeriodoDashboard): boolean {
  const fecha = new Date(fechaVenta);
  if (Number.isNaN(fecha.getTime())) return false;
  const desde = inicioPeriodo(periodo);
  const hasta = finHoy();
  return fecha >= desde && fecha <= hasta;
}

export function filtrarVentasPorPeriodo(ventas: Venta[], periodo: PeriodoDashboard): Venta[] {
  if (!ventas?.length) return [];
  return ventas.filter((v) => ventaEnPeriodo(v.fechaVenta, periodo));
}

function diasEnPeriodo(periodo: PeriodoDashboard): number {
  switch (periodo) {
    case 'hoy':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
  }
}

/** Rango del período inmediatamente anterior (misma duración que el período activo). */
export function rangoPeriodoAnterior(periodo: PeriodoDashboard): { inicio: Date; fin: Date } {
  const inicioActual = inicioPeriodo(periodo);
  const finAnterior = new Date(inicioActual.getTime() - 1);
  finAnterior.setHours(23, 59, 59, 999);
  const inicioAnterior = new Date(finAnterior);
  inicioAnterior.setDate(inicioAnterior.getDate() - (diasEnPeriodo(periodo) - 1));
  inicioAnterior.setHours(0, 0, 0, 0);
  return { inicio: inicioAnterior, fin: finAnterior };
}

export function filtrarVentasEnRango(ventas: Venta[], inicio: Date, fin: Date): Venta[] {
  if (!ventas?.length) return [];
  return ventas.filter((v) => {
    const f = new Date(v.fechaVenta);
    return !Number.isNaN(f.getTime()) && f >= inicio && f <= fin;
  });
}

function pctCrecimiento(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
}

function metricasDesdeVentas(ventas: Venta[]) {
  const totalVentas = ventas.reduce((s, v) => s + (v.totalVentas ?? 0), 0);
  const totalOrdenes = ventas.length;
  const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
  const clientesActivos = new Set(
    ventas.map((v) => v.cliente?.idCliente).filter((id) => id !== undefined)
  ).size;
  return { totalVentas, totalOrdenes, ticketPromedio, clientesActivos };
}

export interface MetricasComparacionPeriodo {
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoTicket: number;
  crecimientoClientes: number;
}

/** Compara período activo vs ventana anterior equivalente (alineado al selector Hoy/7d/30d). */
export function calcularMetricasComparacionPeriodo(
  ventas: Venta[],
  periodo: PeriodoDashboard
): MetricasComparacionPeriodo {
  const actual = filtrarVentasPorPeriodo(ventas, periodo);
  const { inicio, fin } = rangoPeriodoAnterior(periodo);
  const anterior = filtrarVentasEnRango(ventas, inicio, fin);
  const mAct = metricasDesdeVentas(actual);
  const mAnt = metricasDesdeVentas(anterior);
  return {
    crecimientoVentas: pctCrecimiento(mAct.totalVentas, mAnt.totalVentas),
    crecimientoOrdenes: pctCrecimiento(mAct.totalOrdenes, mAnt.totalOrdenes),
    crecimientoTicket: pctCrecimiento(mAct.ticketPromedio, mAnt.ticketPromedio),
    crecimientoClientes: pctCrecimiento(mAct.clientesActivos, mAnt.clientesActivos),
  };
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function procesarDatosGraficoPorPeriodo(
  ventas: Venta[],
  periodo: PeriodoDashboard
): PuntoGraficoDashboard[] {
  if (periodo === 'hoy') {
    return procesarGraficoHoy(ventas);
  }

  if (periodo === '7d') {
    const datos: PuntoGraficoDashboard[] = [];
    const inicio = inicioPeriodo('7d');
    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(inicio);
      fechaDia.setDate(inicio.getDate() + i);
      fechaDia.setHours(0, 0, 0, 0);
      const fechaDiaFin = new Date(fechaDia);
      fechaDiaFin.setHours(23, 59, 59, 999);

      const ventasDia = ventas.filter((v) => {
        const f = new Date(v.fechaVenta);
        return f >= fechaDia && f <= fechaDiaFin;
      });

      datos.push({
        label: `${DIAS_CORTOS[fechaDia.getDay()]} ${fechaDia.getDate()}`,
        ventas: ventasDia.reduce((s, v) => s + (v.totalVentas ?? 0), 0),
      });
    }
    return datos;
  }

  const semanas = 4;
  const inicio30 = inicioPeriodo('30d');
  const totalDias = 30;
  const diasPorSemana = Math.ceil(totalDias / semanas);
  const datos: PuntoGraficoDashboard[] = [];

  for (let w = 0; w < semanas; w++) {
    const desde = new Date(inicio30);
    desde.setDate(inicio30.getDate() + w * diasPorSemana);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde);
    hasta.setDate(desde.getDate() + diasPorSemana - 1);
    hasta.setHours(23, 59, 59, 999);
    if (hasta > finHoy()) hasta.setTime(finHoy().getTime());

    const ventasSemana = ventas.filter((v) => {
      const f = new Date(v.fechaVenta);
      return f >= desde && f <= hasta;
    });

    const labelDesde = `${desde.getDate()}/${desde.getMonth() + 1}`;
    const labelHasta = `${hasta.getDate()}/${hasta.getMonth() + 1}`;
    datos.push({
      label: `S${w + 1} (${labelDesde}-${labelHasta})`,
      ventas: ventasSemana.reduce((s, v) => s + (v.totalVentas ?? 0), 0),
    });
  }

  return datos;
}
