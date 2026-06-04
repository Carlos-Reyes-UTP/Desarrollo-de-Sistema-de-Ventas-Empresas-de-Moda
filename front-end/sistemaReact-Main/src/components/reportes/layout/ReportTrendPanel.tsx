import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MaterialIcon } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ReportChartTooltip } from '@/components/reportes/layout/ReportChartTooltip';
import {
  ReportChartGradientDef,
  reportChartAxisTick,
  reportChartCursor,
} from '@/components/reportes/layout/reportChartTheme';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const formatterEjeY = (valor: number) => {
  if (valor >= 1000) return `S/${(valor / 1000).toFixed(0)}k`;
  return `S/${valor.toFixed(0)}`;
};

export interface ChartPoint {
  label: string;
  ventas: number;
}

export interface DayPoint {
  dia: string;
  ventas: number;
}

interface ReportTrendPanelProps {
  chartPoints: ChartPoint[];
  dayData: DayPoint[];
  tituloGrafico: string;
  subtitulo?: string;
  serieLabel?: string;
  gradientId?: string;
}

const AreaTooltipContent = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <ReportChartTooltip
      title={label}
      rows={[{ label: 'Total', value: formatterMonedaPE.format(payload[0].value), emphasize: true }]}
    />
  );
};

const DayTooltipContent = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <ReportChartTooltip
      title={label}
      rows={[{ label: 'Ventas', value: formatterMonedaPE.format(payload[0].value), emphasize: true }]}
    />
  );
};

export const ReportTrendPanel = ({
  chartPoints,
  dayData,
  tituloGrafico,
  subtitulo,
  serieLabel,
  gradientId = 'reportTrendAreaGrad',
}: ReportTrendPanelProps) => {
  const { bestDay, worstDay, bestDayIdx } = useMemo(() => {
    const max = Math.max(...dayData.map((d) => d.ventas), 0);
    const best = dayData.find((d) => d.ventas === max) ?? null;
    const nonZero = dayData.filter((d) => d.ventas > 0);
    const min = nonZero.length ? Math.min(...nonZero.map((d) => d.ventas)) : 0;
    const worst = nonZero.length ? (nonZero.find((d) => d.ventas === min) ?? null) : null;
    const idx = dayData.findIndex((d) => d === best);
    return { bestDay: best, worstDay: worst, bestDayIdx: idx };
  }, [dayData]);

  const gridStroke = 'var(--app-border)';

  return (
    <DashboardPanel className="report-trend-hero !p-6 sm:!p-8">
      <div className="mb-6">
        <p className="text-lg font-black app-heading tracking-tight">{tituloGrafico}</p>
        {subtitulo ? <p className="text-xs app-text-muted mt-1">{subtitulo}</p> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] app-text-faint mb-3">
            {serieLabel ?? `Serie — ${new Date().getFullYear()}`}
          </p>
          <div className="h-[280px]">
            {chartPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)]">
                <p className="text-sm font-medium app-text-muted">Sin ventas en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                  <ReportChartGradientDef />
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={reportChartAxisTick} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={formatterEjeY}
                    tick={reportChartAxisTick}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<AreaTooltipContent />} cursor={{ stroke: 'var(--app-border)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="var(--app-accent)"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--app-accent)', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] app-text-faint mb-3">
              Distribución semanal
            </p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={reportChartAxisTick} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={formatterEjeY}
                    tick={reportChartAxisTick}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<DayTooltipContent />} cursor={reportChartCursor} />
                  <Bar dataKey="ventas" radius={[4, 4, 0, 0]} maxBarSize={22}>
                    {dayData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === bestDayIdx
                            ? 'var(--app-accent)'
                            : 'color-mix(in srgb, var(--app-bg-muted) 85%, var(--app-text) 8%)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="report-day-callout report-day-callout--best">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[var(--app-metric-icon-1-fg)]">
                <MaterialIcon icon="trending_up" className="w-3.5 h-3.5" />
                Mejor día
              </span>
              <p className="text-sm font-black app-heading mt-1">{bestDay ? bestDay.dia : '—'}</p>
              <p className="text-xs font-black tabular-nums text-[var(--app-metric-icon-1-fg)] mt-2">
                {bestDay ? formatterMonedaPE.format(bestDay.ventas) : 'S/ 0.00'}
              </p>
            </div>
            <div className="report-day-callout report-day-callout--worst">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[var(--app-metric-icon-5-fg)]">
                <MaterialIcon icon="trending_down" className="w-3.5 h-3.5" />
                Peor día
              </span>
              <p className="text-sm font-black app-heading mt-1">{worstDay ? worstDay.dia : '—'}</p>
              <p className="text-xs font-black tabular-nums text-[var(--app-metric-icon-5-fg)] mt-2">
                {worstDay ? formatterMonedaPE.format(worstDay.ventas) : 'S/ 0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
};
