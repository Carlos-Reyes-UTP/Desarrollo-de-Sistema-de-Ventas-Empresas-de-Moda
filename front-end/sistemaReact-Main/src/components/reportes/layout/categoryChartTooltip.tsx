import type { ReporteCategoriaData } from '@/types/ReporteVentas';
import { ReportChartTooltip } from '@/components/reportes/layout/ReportChartTooltip';

interface CustomTooltipProps {
  active?: boolean;
  payload?: unknown[];
  label?: string;
}

export const CustomTooltipCategoria = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const data = (payload as { payload: ReporteCategoriaData }[])[0].payload;
  const rows = [
    { label: 'Ingresos', value: `S/ ${Number(data.ingresosTotales).toLocaleString('es-PE')}`, emphasize: true },
    { label: 'Unidades', value: `${data.cantidadTotalVendida || 0} uds` },
    { label: 'Productos', value: `${data.cantidadProductosVendidos || 0} items` },
    ...(data.productoMasVendido?.nombre
      ? [
          {
            label: 'Top SKU',
            value: `${data.productoMasVendido.nombre} (${data.productoMasVendido.cantidadVendida} uds)`,
          },
        ]
      : []),
  ];
  return <ReportChartTooltip title={data.categoria || label} rows={rows} />;
};
