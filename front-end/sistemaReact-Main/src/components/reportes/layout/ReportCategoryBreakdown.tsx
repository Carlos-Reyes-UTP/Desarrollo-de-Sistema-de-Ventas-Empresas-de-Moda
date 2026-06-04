import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ReporteCategoriaData } from '@/types/ReporteVentas';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { SectionHeader } from '@/shared/ui';
import { ReportChartTooltip } from '@/components/reportes/layout/ReportChartTooltip';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const SLICE_COLORS = [
  'var(--app-accent)',
  'var(--app-metric-icon-2-fg)',
  'var(--app-metric-icon-3-fg)',
  'var(--app-metric-icon-4-fg)',
  'var(--app-metric-icon-1-fg)',
  'var(--app-metric-icon-5-fg)',
];

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ReporteCategoriaData & { pct: number } }>;
}

const CategoryPieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <ReportChartTooltip
      title={row.categoria}
      rows={[
        { label: 'Ingresos', value: formatterMonedaPE.format(Number(row.ingresosTotales || 0)), emphasize: true },
        { label: 'Participación', value: `${row.pct.toFixed(1)}%` },
        { label: 'Unidades', value: row.cantidadTotalVendida },
      ]}
    />
  );
};

interface ReportCategoryBreakdownProps {
  categorias: ReporteCategoriaData[];
}

export const ReportCategoryBreakdown = ({ categorias }: ReportCategoryBreakdownProps) => {
  const { chartData, totalIngresos } = useMemo(() => {
    const sorted = [...categorias]
      .filter((c) => Number(c.ingresosTotales || 0) > 0)
      .sort((a, b) => Number(b.ingresosTotales) - Number(a.ingresosTotales));
    const total = sorted.reduce((s, c) => s + Number(c.ingresosTotales || 0), 0);
    const chartData = sorted.map((c) => ({
      ...c,
      pct: total > 0 ? (Number(c.ingresosTotales) / total) * 100 : 0,
    }));
    return { chartData, totalIngresos: total };
  }, [categorias]);

  return (
    <DashboardPanel className="h-full min-h-[280px] flex flex-col">
      <SectionHeader title="Ventas por categoría" subtitle="Participación de ingresos en el período" />
      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] min-h-[200px]">
          <p className="text-sm font-medium app-text-muted">Sin ventas por categoría en este período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 flex-1 items-center">
          <div className="h-[220px] min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  cornerRadius={4}
                  dataKey="ingresosTotales"
                  stroke="var(--app-panel)"
                  strokeWidth={2}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cat-slice-${index}`} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CategoryPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {chartData.map((row, index) => (
              <li key={row.idCategoria ?? row.categoria} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
                  />
                  <span className="font-bold app-heading truncate" title={row.categoria}>
                    {row.categoria}
                  </span>
                </span>
                <span className="font-black tabular-nums app-text-muted shrink-0">{row.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalIngresos > 0 ? (
        <p className="text-[10px] font-bold app-text-faint mt-4 pt-3 border-t border-[var(--app-border)]">
          Total categorías: {formatterMonedaPE.format(totalIngresos)}
        </p>
      ) : null}
    </DashboardPanel>
  );
};
