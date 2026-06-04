import { createContext, useContext, type ReactNode } from 'react';
import { useReportPeriod, type PeriodoDashboard } from '@/components/reportes/hooks/useReportPeriod';
import type { FiltrosReporte } from '@/types/ReporteVentas';

interface ReportPeriodContextValue {
  periodo: PeriodoDashboard;
  setPeriodo: (p: PeriodoDashboard) => void;
  etiqueta: string;
  filtrosFecha: FiltrosReporte;
}

const ReportPeriodContext = createContext<ReportPeriodContextValue | null>(null);

export function ReportPeriodProvider({ children }: { children: ReactNode }) {
  const value = useReportPeriod();
  return <ReportPeriodContext.Provider value={value}>{children}</ReportPeriodContext.Provider>;
}

export function useReportPeriodContext(): ReportPeriodContextValue {
  const ctx = useContext(ReportPeriodContext);
  if (!ctx) {
    throw new Error('useReportPeriodContext debe usarse dentro de ReportPeriodProvider');
  }
  return ctx;
}
