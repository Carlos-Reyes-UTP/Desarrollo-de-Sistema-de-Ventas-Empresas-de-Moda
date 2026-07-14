import type { ReactNode } from 'react';
import { MaterialIcon } from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';

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
  etiquetaPeriodo: string;
  deltaVsLabel?: string;
}

function DeltaBadge({ pct }: { pct: number }) {
  if (pct === 0) {
    return <span className="report-delta-chip report-delta-chip--flat">0%</span>;
  }
  const up = pct > 0;
  return (
    <span className={`report-delta-chip ${up ? 'report-delta-chip--up' : 'report-delta-chip--down'}`}>
      <MaterialIcon icon={up ? 'trending_up' : 'trending_down'} className="w-3.5 h-3.5" />
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

export const ReportMetricStrip = ({
  resumen,
  etiquetaPeriodo,
  deltaVsLabel = 'período anterior',
}: ReportMetricStripProps) => {
  const fmt = (v: number) => formatterMonedaPE.format(v);

  const card = (label: string, value: ReactNode, icon: string, crecimiento: number) => (
    <div className="report-quick-kpi">
      <DashboardMetricCard
        label={label}
        value={value}
        icon={icon}
        iconWrapClassName="report-metric-kpi-icon"
        iconClassName="report-metric-kpi-icon__glyph"
        sub={`vs ${deltaVsLabel} · ${etiquetaPeriodo}`}
      />
      <div className="report-quick-kpi__delta">
        <DeltaBadge pct={crecimiento} />
      </div>
    </div>
  );

  return (
    <section className="report-metric-strip__kpi-grid" aria-label="Métricas del período">
      {card('Ingresos', fmt(resumen.totalVentas), 'payments', resumen.crecimientoVentas)}
      {card(
        'Transacciones',
        resumen.totalOrdenes.toLocaleString('es-PE'),
        'receipt_long',
        resumen.crecimientoOrdenes
      )}
      {card('Ticket prom.', fmt(resumen.ticketPromedio), 'trending_up', resumen.crecimientoTicket)}
    </section>
  );
};
