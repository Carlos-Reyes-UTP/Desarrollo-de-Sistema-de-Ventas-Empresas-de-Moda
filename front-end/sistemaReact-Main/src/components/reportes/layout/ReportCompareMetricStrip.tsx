import { MaterialIcon } from '@/shared/ui';
import type { ReportInsightResult } from '@/utils/reportInsights';
import type { ResultadoCompararMeses } from '@/utils/reportesCompararMeses';

const fmtMoneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

interface ReportCompareMetricStripProps {
  comparativa: ResultadoCompararMeses;
}

function DeltaChip({ pct }: { pct: number }) {
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

function CompareKpiCard({
  label,
  icon,
  baseValue,
  focusValue,
  baseLabel,
  focusLabel,
  delta,
  format = 'moneda',
}: {
  label: string;
  icon: string;
  baseValue: number;
  focusValue: number;
  baseLabel: string;
  focusLabel: string;
  delta: number;
  format?: 'moneda' | 'entero';
}) {
  const fmt = (v: number) =>
    format === 'moneda' ? fmtMoneda.format(v) : v.toLocaleString('es-PE');

  return (
    <article className="report-compare-kpi app-metric-card border">
      <div className="report-compare-kpi__top">
        <div className="report-compare-kpi__icon" aria-hidden>
          <MaterialIcon icon={icon} fill className="w-4 h-4" />
        </div>
        <p className="report-compare-kpi__label">{label}</p>
        <DeltaChip pct={delta} />
      </div>

      <div className="report-compare-kpi__rows">
        <div className="report-compare-kpi__row report-compare-kpi__row--base">
          <span className="report-compare-kpi__month">
            <span className="report-compare-dot report-compare-dot--base" aria-hidden />
            {baseLabel}
          </span>
          <span className="report-compare-kpi__value">{fmt(baseValue)}</span>
        </div>
        <div className="report-compare-kpi__row report-compare-kpi__row--focus">
          <span className="report-compare-kpi__month">
            <span className="report-compare-dot report-compare-dot--focus" aria-hidden />
            {focusLabel}
          </span>
          <span className="report-compare-kpi__value report-compare-kpi__value--focus">
            {fmt(focusValue)}
          </span>
        </div>
      </div>
    </article>
  );
}

export const ReportCompareMetricStrip = ({ comparativa }: ReportCompareMetricStripProps) => (
  <section className="report-compare-kpi-grid" aria-label="Comparativa de métricas">
    <CompareKpiCard
      label="Ingresos"
      icon="payments"
      baseValue={comparativa.base.totalVentas}
      focusValue={comparativa.comparar.totalVentas}
      baseLabel={comparativa.etiquetaBase}
      focusLabel={comparativa.etiquetaComparar}
      delta={comparativa.deltas.crecimientoVentas}
    />
    <CompareKpiCard
      label="Transacciones"
      icon="receipt_long"
      baseValue={comparativa.base.totalOrdenes}
      focusValue={comparativa.comparar.totalOrdenes}
      baseLabel={comparativa.etiquetaBase}
      focusLabel={comparativa.etiquetaComparar}
      delta={comparativa.deltas.crecimientoOrdenes}
      format="entero"
    />
    <CompareKpiCard
      label="Ticket prom."
      icon="trending_up"
      baseValue={comparativa.base.ticketPromedio}
      focusValue={comparativa.comparar.ticketPromedio}
      baseLabel={comparativa.etiquetaBase}
      focusLabel={comparativa.etiquetaComparar}
      delta={comparativa.deltas.crecimientoTicket}
    />
  </section>
);

/** Franja de veredicto para lectura en &lt;5s. */
export function ReportVerdictBanner({ insights }: { insights: ReportInsightResult }) {
  return (
    <div className="report-verdict" role="status">
      <span className="report-verdict__score">
        <MaterialIcon icon="monitoring" className="w-3.5 h-3.5" />
        {insights.score}
      </span>
      <div className="report-verdict__copy">
        <p className="report-verdict__headline">{insights.headline}</p>
        <p className="report-verdict__summary">{insights.summary}</p>
      </div>
    </div>
  );
}
