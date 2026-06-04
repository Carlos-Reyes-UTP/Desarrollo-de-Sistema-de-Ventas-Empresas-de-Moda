import type { ReportInsightResult } from '@/utils/reportInsights';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { ReportHealthGaugeCompact } from '@/components/reportes/layout/ReportHealthGaugeCompact';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export interface ResumenMetricasInput {
  totalVentas: number;
  totalOrdenes: number;
  clientesActivos: number;
  ticketPromedio: number;
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoClientes: number;
  crecimientoTicket: number;
}

interface ReportMetricStripProps {
  resumen: ResumenMetricasInput;
  insights: ReportInsightResult;
  etiquetaPeriodo: string;
}

function subConDelta(etiqueta: string, crecimiento: number | undefined): string {
  const base = etiqueta.toLowerCase();
  if (crecimiento === undefined || crecimiento === 0) return base;
  const sign = crecimiento >= 0 ? '+' : '';
  return `${base} · ${sign}${crecimiento.toFixed(1)}% vs anterior`;
}

export const ReportMetricStrip = ({ resumen, insights, etiquetaPeriodo }: ReportMetricStripProps) => {
  const fmt = (v: number) => formatterMonedaPE.format(v);

  return (
    <section className="reports-analytics__metric-strip" aria-label="Métricas del período">
      <div className="report-metric-strip__health">
        <ReportHealthGaugeCompact
          score={insights.score}
          headline={insights.headline}
          summary={insights.summary}
        />
      </div>
      <div className="report-metric-strip__kpis">
        <div className="report-metric-strip__kpi-grid">
          <DashboardMetricCard
            label="Ingresos"
            value={fmt(resumen.totalVentas)}
            icon="payments"
            iconWrapClassName="report-metric-kpi-icon"
            iconClassName="report-metric-kpi-icon__glyph"
            sub={subConDelta(
              etiquetaPeriodo,
              resumen.crecimientoVentas !== 0 ? resumen.crecimientoVentas : undefined
            )}
          />
          <DashboardMetricCard
            label="Transacciones"
            value={resumen.totalOrdenes.toLocaleString('es-PE')}
            icon="receipt_long"
            iconWrapClassName="report-metric-kpi-icon"
            iconClassName="report-metric-kpi-icon__glyph"
            sub={subConDelta(
              etiquetaPeriodo,
              resumen.crecimientoOrdenes !== 0 ? resumen.crecimientoOrdenes : undefined
            )}
          />
          <DashboardMetricCard
            label="Ticket prom."
            value={fmt(resumen.ticketPromedio)}
            icon="trending_up"
            iconWrapClassName="report-metric-kpi-icon"
            iconClassName="report-metric-kpi-icon__glyph"
            sub={subConDelta(
              etiquetaPeriodo,
              resumen.crecimientoTicket !== 0 ? resumen.crecimientoTicket : undefined
            )}
          />
        </div>
      </div>
    </section>
  );
};
