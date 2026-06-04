import { useCallback, useState } from 'react';
import {
  type PeriodoDashboard,
  guardarPeriodo,
  leerPeriodoGuardado,
  etiquetaPeriodo,
  inicioPeriodo,
} from '@/utils/dashboardPeriodo';
import type { FiltrosReporte } from '@/types/ReporteVentas';

const STORAGE_KEY = 'reportes-periodo';

export function leerPeriodoReportes(): PeriodoDashboard {
  if (typeof window === 'undefined') return '7d';
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === 'hoy' || raw === '7d' || raw === '30d') return raw;
  return leerPeriodoGuardado();
}

export function guardarPeriodoReportes(periodo: PeriodoDashboard): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, periodo);
  }
  guardarPeriodo(periodo);
}

export function filtrosReporteDesdePeriodo(periodo: PeriodoDashboard): FiltrosReporte {
  const fin = new Date();
  const inicio = inicioPeriodo(periodo);
  return {
    fechaInicio: inicio.toISOString().split('T')[0],
    fechaFin: fin.toISOString().split('T')[0],
  };
}

export const PERIODOS_REPORTE: Array<{ id: PeriodoDashboard; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

export function useReportPeriod() {
  const [periodo, setPeriodoState] = useState<PeriodoDashboard>(() => leerPeriodoReportes());

  const setPeriodo = useCallback((p: PeriodoDashboard) => {
    guardarPeriodoReportes(p);
    setPeriodoState(p);
  }, []);

  const etiqueta = etiquetaPeriodo(periodo);
  const filtrosFecha = filtrosReporteDesdePeriodo(periodo);

  return { periodo, setPeriodo, etiqueta, filtrosFecha };
}

export { etiquetaPeriodo, type PeriodoDashboard };
