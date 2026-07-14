import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MaterialIcon, SectionHeader } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import type { PuntoRitmoDiario } from '@/utils/dashboardMes';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const formatterEjeY = (valor: number) => {
  if (valor >= 1000) {
    return `S/${(valor / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k`;
  }
  return `S/${valor.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
};

export interface DashboardSalesPaceChartProps {
  data: PuntoRitmoDiario[];
  compareOn: boolean;
  empty?: boolean;
}

export function DashboardSalesPaceChart({ data, compareOn, empty }: DashboardSalesPaceChartProps) {
  const hasData = data.some((d) => d.actual > 0 || (d.anterior ?? 0) > 0);

  return (
    <DashboardPanel>
      <SectionHeader title="Ritmo de ventas" />
      <p className="text-[10px] font-bold app-text-muted -mt-4 mb-2">
        Día a día del mes
        {compareOn ? ' · sombra = mes anterior' : ''}
      </p>
      <div className="h-[300px] w-full" aria-label="Ritmo de ventas del mes">
        {empty || !hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
            <MaterialIcon icon="show_chart" className="w-10 h-10 app-text-faint" />
            <p className="text-sm font-black app-heading">Sin ventas en este mes</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 4, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatterEjeY} tick={{ fontSize: 10 }} width={48} />
              <Tooltip
                formatter={(value) => formatterMonedaPE.format(Number(value ?? 0))}
                labelFormatter={(label) => `Día ${label}`}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-canvas)',
                }}
              />
              {compareOn ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
              <Bar
                dataKey="actual"
                name="Mes actual"
                fill="url(#dashboardPaceActual)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              {compareOn ? (
                <Bar
                  dataKey="anterior"
                  name="Mes anterior"
                  fill="var(--app-border)"
                  fillOpacity={0.55}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              ) : null}
              <defs>
                <linearGradient id="dashboardPaceActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0.35} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardPanel>
  );
}
