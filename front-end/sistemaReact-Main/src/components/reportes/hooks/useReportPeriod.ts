import { useCallback, useMemo, useState } from 'react';
import {
  type PeriodoDashboard,
  guardarPeriodo,
  leerPeriodoGuardado,
  etiquetaPeriodo,
  inicioPeriodo,
} from '@/utils/dashboardPeriodo';
import type { FiltrosReporte } from '@/types/ReporteVentas';
import {
  type MesRef,
  type ModoReportePeriodo,
  etiquetaMesUi,
  mesActual,
  mesAnteriorA,
  mesEsFuturo,
  mesRefFromKey,
  mesRefToKey,
  mismoMes,
  rangoMesCalendario,
} from '@/utils/reportesCompararMeses';

const STORAGE_KEY = 'reportes-periodo';
const STORAGE_MODO = 'reportes-modo';
const STORAGE_MES_BASE = 'reportes-mes-base';
const STORAGE_MES_COMPARAR = 'reportes-mes-comparar';

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

export function leerModoReportes(): ModoReportePeriodo {
  if (typeof window === 'undefined') return 'rapido';
  const raw = sessionStorage.getItem(STORAGE_MODO);
  return raw === 'comparar' ? 'comparar' : 'rapido';
}

export function guardarModoReportes(modo: ModoReportePeriodo): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_MODO, modo);
  }
}

function defaultsMesesComparar(): { mesBase: MesRef; mesComparar: MesRef } {
  const mesComparar = mesActual();
  return { mesComparar, mesBase: mesAnteriorA(mesComparar) };
}

export function leerMesBaseReportes(): MesRef {
  if (typeof window === 'undefined') return defaultsMesesComparar().mesBase;
  const parsed = mesRefFromKey(sessionStorage.getItem(STORAGE_MES_BASE));
  if (parsed && !mesEsFuturo(parsed)) return parsed;
  return defaultsMesesComparar().mesBase;
}

export function leerMesCompararReportes(): MesRef {
  if (typeof window === 'undefined') return defaultsMesesComparar().mesComparar;
  const parsed = mesRefFromKey(sessionStorage.getItem(STORAGE_MES_COMPARAR));
  if (parsed && !mesEsFuturo(parsed)) return parsed;
  return defaultsMesesComparar().mesComparar;
}

export function guardarMesBaseReportes(ref: MesRef): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_MES_BASE, mesRefToKey(ref));
  }
}

export function guardarMesCompararReportes(ref: MesRef): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_MES_COMPARAR, mesRefToKey(ref));
  }
}

export function filtrosReporteDesdePeriodo(periodo: PeriodoDashboard): FiltrosReporte {
  const fin = new Date();
  const inicio = inicioPeriodo(periodo);
  return {
    fechaInicio: inicio.toISOString().split('T')[0],
    fechaFin: fin.toISOString().split('T')[0],
  };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filtrosDesdeMeses(mesBase: MesRef, mesComparar: MesRef): FiltrosReporte {
  const rA = rangoMesCalendario(mesBase);
  const rB = rangoMesCalendario(mesComparar);
  const inicio = rA.inicio.getTime() <= rB.inicio.getTime() ? rA.inicio : rB.inicio;
  const fin = rA.fin.getTime() >= rB.fin.getTime() ? rA.fin : rB.fin;
  return {
    fechaInicio: toIsoDate(inicio),
    fechaFin: toIsoDate(fin),
  };
}

export const PERIODOS_REPORTE: Array<{ id: PeriodoDashboard; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

export function useReportPeriod() {
  const [periodo, setPeriodoState] = useState<PeriodoDashboard>(() => leerPeriodoReportes());
  const [modo, setModoState] = useState<ModoReportePeriodo>(() => leerModoReportes());
  const [mesBase, setMesBaseState] = useState<MesRef>(() => leerMesBaseReportes());
  const [mesComparar, setMesCompararState] = useState<MesRef>(() => leerMesCompararReportes());

  const setPeriodo = useCallback((p: PeriodoDashboard) => {
    guardarPeriodoReportes(p);
    setPeriodoState(p);
  }, []);

  const setModo = useCallback((m: ModoReportePeriodo) => {
    guardarModoReportes(m);
    setModoState(m);
  }, []);

  const setMesBase = useCallback((ref: MesRef) => {
    if (mesEsFuturo(ref)) return;
    guardarMesBaseReportes(ref);
    setMesBaseState(ref);
  }, []);

  const setMesComparar = useCallback((ref: MesRef) => {
    if (mesEsFuturo(ref)) return;
    guardarMesCompararReportes(ref);
    setMesCompararState(ref);
  }, []);

  const swapMeses = useCallback(() => {
    const a = mesBase;
    const b = mesComparar;
    guardarMesBaseReportes(b);
    guardarMesCompararReportes(a);
    setMesBaseState(b);
    setMesCompararState(a);
  }, [mesBase, mesComparar]);

  const mesesIguales = mismoMes(mesBase, mesComparar);

  const etiqueta = useMemo(() => {
    if (modo === 'comparar') {
      return `${etiquetaMesUi(mesComparar)} vs ${etiquetaMesUi(mesBase)}`;
    }
    return etiquetaPeriodo(periodo);
  }, [modo, periodo, mesBase, mesComparar]);

  const filtrosFecha = useMemo(() => {
    if (modo === 'comparar') return filtrosDesdeMeses(mesBase, mesComparar);
    return filtrosReporteDesdePeriodo(periodo);
  }, [modo, periodo, mesBase, mesComparar]);

  return {
    periodo,
    setPeriodo,
    modo,
    setModo,
    mesBase,
    setMesBase,
    mesComparar,
    setMesComparar,
    swapMeses,
    mesesIguales,
    etiqueta,
    filtrosFecha,
  };
}

export { etiquetaPeriodo, type PeriodoDashboard };
export type { MesRef, ModoReportePeriodo };
