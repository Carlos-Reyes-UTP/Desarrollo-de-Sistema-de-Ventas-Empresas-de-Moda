import type { PieLabelRenderProps } from 'recharts';
import { ReportChartTooltip } from '@/components/reportes/layout/ReportChartTooltip';

interface TooltipPayload<T> {
  payload: T;
}

interface TooltipProps<T> {
  active?: boolean;
  payload?: TooltipPayload<T>[];
}

interface ProductoTooltipData {
  nombreProducto: string;
  categoriaPadre?: string;
  categoria?: string;
  subCategoria2?: string;
  cantidadVendida: number;
}

interface VariantesTooltipData {
  nombreColor: string;
  cantidadVendida: number;
  cantidadStock: number;
  ingresosTotales: string | number;
  hexColor?: string;
}

export const CustomTooltip = ({ active, payload }: TooltipProps<ProductoTooltipData>) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const rows = [
    { label: 'Categoría', value: data.categoriaPadre || 'General' },
    { label: 'Sub-categoría', value: data.categoria || '—' },
    ...(data.subCategoria2 ? [{ label: 'Detalle', value: data.subCategoria2 }] : []),
    { label: 'Vendido', value: `${data.cantidadVendida.toLocaleString('es-PE')} uds`, emphasize: true },
  ];
  return <ReportChartTooltip title={data.nombreProducto} rows={rows} />;
};

export const CustomTooltipVariantes = ({ active, payload }: TooltipProps<VariantesTooltipData>) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <ReportChartTooltip
      title={data.nombreColor}
      rows={[
        { label: 'Unidades', value: data.cantidadVendida.toLocaleString('es-PE') },
        { label: 'Stock', value: data.cantidadStock.toLocaleString('es-PE') },
        {
          label: 'Ingresos',
          value: `S/ ${Number(data.ingresosTotales).toLocaleString('es-PE')}`,
          emphasize: true,
        },
      ]}
    />
  );
};

export const CustomPieLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  const entry = props as PieLabelRenderProps & { nombreColor?: string; cantidadVendida?: number };
  const { nombreColor, cantidadVendida } = entry;

  const cxNum = typeof cx === 'number' ? cx : parseFloat(cx as string) || 0;
  const cyNum = typeof cy === 'number' ? cy : parseFloat(cy as string) || 0;
  const midAngleNum = typeof midAngle === 'number' ? midAngle : 0;
  const outerRadiusNum = typeof outerRadius === 'number' ? outerRadius : 0;

  if (!cantidadVendida || !cxNum || !cyNum || !midAngleNum || !outerRadiusNum) return null;

  const radian = Math.PI / 180;
  const radius = outerRadiusNum + 15;
  const x = cxNum + radius * Math.cos(-midAngleNum * radian);
  const y = cyNum + radius * Math.sin(-midAngleNum * radian);

  return (
    <text
      x={x}
      y={y}
      fill="var(--app-text-faint)"
      textAnchor={x > cxNum ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="11"
      fontWeight="600"
    >
      {`${nombreColor} (${((percent ?? 0) * 100).toFixed(0)}%)`}
    </text>
  );
};
