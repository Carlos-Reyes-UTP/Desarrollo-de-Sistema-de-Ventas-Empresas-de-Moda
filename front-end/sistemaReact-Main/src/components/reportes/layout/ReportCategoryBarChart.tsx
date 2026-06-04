import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReporteCategoriaData } from '@/types/ReporteVentas';
import { SectionHeader } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { CustomTooltipCategoria } from '@/components/reportes/layout/categoryChartTooltip';
import {
  REPORT_CHART_GRADIENT_ID,
  ReportChartGradientDef,
  formatterEjeIngresos,
  getBarFillForIndex,
  reportChartAxisTick,
  reportChartCursor,
  reportChartGridStroke,
  truncateCategoryLabel,
} from '@/components/reportes/layout/reportChartTheme';

export interface ReportCategoryBarChartProps {
  data: ReporteCategoriaData[];
  layout: 'vertical' | 'horizontal';
  variant?: 'gradient' | 'ranked';
  height?: number;
  maxItems?: number;
  title?: string;
  subtitle?: string;
  /** Si false, solo renderiza el chart (p. ej. dentro de drill-down con header propio). */
  wrapPanel?: boolean;
  /** Clic en barra para drill-down de categoría. */
  onCategorySelect?: (item: ReporteCategoriaData) => void;
  drillDownEnabled?: boolean;
}

const ChartEmpty = ({ height }: { height: number }) => (
  <div
    className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)]"
    style={{ height }}
  >
    <p className="text-sm font-medium app-text-muted">No hay datos disponibles</p>
  </div>
);

export const ReportCategoryBarChart = ({
  data,
  layout,
  variant = 'gradient',
  height = 384,
  maxItems,
  title,
  subtitle,
  wrapPanel = true,
  onCategorySelect,
  drillDownEnabled = false,
}: ReportCategoryBarChartProps) => {
  const interactive = Boolean(drillDownEnabled && onCategorySelect);
  const chartData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => Number(b.ingresosTotales || 0) - Number(a.ingresosTotales || 0)
    );
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [data, maxItems]);

  const useAngledLabels = layout === 'vertical' && chartData.length > 4;
  const isHorizontalBars = layout === 'horizontal';

  const chart = (
    <div className="report-category-bar-chart w-full" style={{ height }}>
      {chartData.length === 0 ? (
        <ChartEmpty height={height} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={isHorizontalBars ? 'vertical' : 'horizontal'}
            margin={
              isHorizontalBars
                ? { top: 10, right: 24, left: 4, bottom: 10 }
                : { top: 12, right: 12, left: 4, bottom: useAngledLabels ? 48 : 8 }
            }
          >
            {variant === 'gradient' ? <ReportChartGradientDef /> : null}
            <CartesianGrid
              stroke={reportChartGridStroke}
              strokeDasharray="3 3"
              vertical={false}
            />
            {isHorizontalBars ? (
              <>
                <XAxis
                  type="number"
                  tickFormatter={formatterEjeIngresos}
                  tick={reportChartAxisTick}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    ...reportChartAxisTick,
                    fontSize: 11,
                  }}
                  tickFormatter={(v) => truncateCategoryLabel(String(v), 12)}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="categoria"
                  tick={reportChartAxisTick}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={useAngledLabels ? -25 : 0}
                  textAnchor={useAngledLabels ? 'end' : 'middle'}
                  height={useAngledLabels ? 56 : 30}
                  tickFormatter={(v) => truncateCategoryLabel(String(v), useAngledLabels ? 10 : 14)}
                />
                <YAxis
                  tickFormatter={formatterEjeIngresos}
                  tick={reportChartAxisTick}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
              </>
            )}
            <Tooltip content={<CustomTooltipCategoria />} cursor={reportChartCursor} />
            <Bar
              dataKey="ingresosTotales"
              fill={variant === 'gradient' ? `url(#${REPORT_CHART_GRADIENT_ID})` : undefined}
              radius={isHorizontalBars ? [0, 4, 4, 0] : [6, 6, 0, 0]}
              maxBarSize={isHorizontalBars ? undefined : 48}
              barSize={isHorizontalBars ? 14 : undefined}
              cursor={interactive ? 'pointer' : undefined}
              onClick={
                interactive
                  ? (bar) => {
                      const payload = (bar as { payload?: ReporteCategoriaData })?.payload;
                      if (payload?.idCategoria) onCategorySelect?.(payload);
                    }
                  : undefined
              }
            >
              {variant === 'ranked'
                ? chartData.map((_entry, index) => (
                    <Cell key={`cat-bar-${index}`} fill={getBarFillForIndex(index, true)} />
                  ))
                : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  if (!wrapPanel) {
    return chart;
  }

  return (
    <DashboardPanel>
      {title ? (
        <SectionHeader
          title={title}
          subtitle={
            subtitle ??
            (interactive ? 'Clic en una barra para ver el siguiente nivel' : undefined)
          }
        />
      ) : null}
      {chart}
    </DashboardPanel>
  );
};
