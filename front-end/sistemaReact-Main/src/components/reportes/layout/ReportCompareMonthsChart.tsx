import { MaterialIcon } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import type { PuntoChartCompararMeses } from '@/utils/reportesCompararMeses';
import { pctCrecimientoComparar } from '@/utils/reportesCompararMeses';

const fmtMoneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
});

interface ReportCompareMonthsChartProps {
  data: PuntoChartCompararMeses[];
  etiquetaBase: string;
  etiquetaComparar: string;
  insight?: string;
}

function formatRaw(punto: PuntoChartCompararMeses, which: 'base' | 'comparar'): string {
  const v = which === 'base' ? punto.baseRaw : punto.compararRaw;
  if (punto.formato === 'moneda') return fmtMoneda.format(v);
  return v.toLocaleString('es-PE');
}

function explicaMetrica(metrica: string, pct: number): string {
  const abs = Math.abs(pct).toFixed(1);
  if (Math.abs(pct) < 0.05) {
    if (metrica === 'Ingresos') return 'Casi el mismo dinero en ambos meses.';
    if (metrica === 'Ventas') return 'Casi la misma cantidad de ventas.';
    return 'El promedio por venta casi no cambió.';
  }
  if (pct > 0) {
    if (metrica === 'Ingresos') return `Entró más dinero: subió ${abs}%.`;
    if (metrica === 'Ventas') return `Hubo más ventas: subió ${abs}%.`;
    return `Cada venta dejó más: el ticket subió ${abs}%.`;
  }
  if (metrica === 'Ingresos') return `Entró menos dinero: bajó ${abs}%.`;
  if (metrica === 'Ventas') return `Hubo menos ventas: bajó ${abs}%.`;
  return `Cada venta dejó menos: el ticket bajó ${abs}%.`;
}

function tituloMetrica(metrica: string): string {
  if (metrica === 'Ingresos') return 'Dinero que entró';
  if (metrica === 'Ventas') return 'Cantidad de ventas';
  if (metrica === 'Ticket') return 'Promedio por venta';
  return metrica;
}

export const ReportCompareMonthsChart = ({
  data,
  etiquetaBase,
  etiquetaComparar,
  insight,
}: ReportCompareMonthsChartProps) => (
  <DashboardPanel className="report-trend-hero report-compare-chart-panel p-5 md:p-7">
    <div className="report-compare-chart-head">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] app-metric-label mb-1">
          Qué cambió
        </p>
        <h2 className="text-base md:text-lg font-black app-heading tracking-tight">
          {etiquetaBase} → {etiquetaComparar}
        </h2>
        <p className="report-compare-chart-sub">
          Números reales de cada mes (no se mezclan soles con cantidad de ventas).
        </p>
      </div>
      <div className="report-compare-chart-legend" aria-hidden>
        <span className="report-compare-chart-legend__item">
          <span className="report-compare-dot report-compare-dot--base" />
          Base · {etiquetaBase}
        </span>
        <span className="report-compare-chart-legend__item">
          <span className="report-compare-dot report-compare-dot--focus" />
          Actual · {etiquetaComparar}
        </span>
      </div>
    </div>

    <ul className="report-compare-rows">
      {data.map((punto) => {
        const pct = pctCrecimientoComparar(punto.compararRaw, punto.baseRaw);
        const max = Math.max(punto.baseRaw, punto.compararRaw, 0.0001);
        const wBase = Math.max(4, (punto.baseRaw / max) * 100);
        const wComp = Math.max(4, (punto.compararRaw / max) * 100);
        const up = pct > 0.05;
        const down = pct < -0.05;

        return (
          <li key={punto.metrica} className="report-compare-row">
            <div className="report-compare-row__top">
              <div>
                <p className="report-compare-row__label">{tituloMetrica(punto.metrica)}</p>
                <p className="report-compare-row__explain">{explicaMetrica(punto.metrica, pct)}</p>
              </div>
              <span
                className={`report-compare-row__delta ${
                  up
                    ? 'report-compare-row__delta--up'
                    : down
                      ? 'report-compare-row__delta--down'
                      : 'report-compare-row__delta--flat'
                }`}
              >
                <MaterialIcon
                  icon={up ? 'trending_up' : down ? 'trending_down' : 'remove'}
                  className="w-3.5 h-3.5"
                />
                {up ? '+' : ''}
                {pct.toFixed(1)}%
              </span>
            </div>

            <div className="report-compare-row__bars" aria-hidden>
              <div className="report-compare-row__bar-line">
                <span className="report-compare-row__bar-tag">{etiquetaBase}</span>
                <div className="report-compare-row__track">
                  <div
                    className="report-compare-row__fill report-compare-row__fill--base"
                    style={{ width: `${wBase}%` }}
                  />
                </div>
                <strong className="report-compare-row__val">{formatRaw(punto, 'base')}</strong>
              </div>
              <div className="report-compare-row__bar-line">
                <span className="report-compare-row__bar-tag">{etiquetaComparar}</span>
                <div className="report-compare-row__track">
                  <div
                    className="report-compare-row__fill report-compare-row__fill--focus"
                    style={{ width: `${wComp}%` }}
                  />
                </div>
                <strong className="report-compare-row__val">{formatRaw(punto, 'comparar')}</strong>
              </div>
            </div>
          </li>
        );
      })}
    </ul>

    {insight ? <p className="report-compare-chart-insight">{insight}</p> : null}
  </DashboardPanel>
);
