import type { PieLabelRenderProps } from 'recharts';

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
}

export const CustomTooltip = ({ active, payload }: TooltipProps<ProductoTooltipData>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-md p-4 border border-gray-100/80 dark:border-gray-800/80 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/60 transition-all duration-205 max-w-xs">
      <div className="flex items-center gap-2 border-b border-gray-100/50 dark:border-gray-800/50 pb-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{data.nombreProducto}</h4>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="font-medium text-gray-400 dark:text-gray-500">Categoría:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{data.categoriaPadre || 'General'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="font-medium text-gray-400 dark:text-gray-500">Sub-categoría:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{data.categoria || '—'}</span>
        </div>
        {data.subCategoria2 && (
          <div className="flex justify-between gap-4">
            <span className="font-medium text-gray-400 dark:text-gray-500">Detalle:</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{data.subCategoria2}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-gray-100/50 dark:border-gray-800/50 pt-2 mt-2">
          <span className="font-semibold text-gray-850 dark:text-gray-200">Total Vendido:</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{data.cantidadVendida.toLocaleString()} uds</span>
        </div>
      </div>
    </div>
  );
};

export const CustomTooltipVariantes = ({
  active,
  payload,
}: TooltipProps<VariantesTooltipData>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-md p-4 border border-gray-100/80 dark:border-gray-800/80 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/60 transition-all duration-205">
      <div className="flex items-center gap-2 border-b border-gray-100/50 dark:border-gray-800/50 pb-2 mb-2">
        <div 
          className="w-2.5 h-2.5 rounded-full border border-gray-200 dark:border-gray-750" 
          style={{ backgroundColor: (data as any).hexColor || '#3B82F6' }}
        />
        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{data.nombreColor}</h4>
      </div>
      <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-350">
        <div className="flex justify-between gap-6">
          <span className="font-medium text-gray-400 dark:text-gray-500">Unidades Vendidas:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{data.cantidadVendida.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="font-medium text-gray-400 dark:text-gray-500">Stock Disponible:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{data.cantidadStock.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 border-t border-gray-100/50 dark:border-gray-800/50 pt-2 mt-2">
          <span className="font-semibold text-gray-850 dark:text-gray-200">Ingresos Totales:</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">S/ {Number(data.ingresosTotales).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export const CustomPieLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  // Domain-specific fields passed by Recharts through the data entry
  const entry = props as PieLabelRenderProps & { nombreColor?: string; cantidadVendida?: number };
  const { nombreColor, cantidadVendida } = entry;

  const cxNum = typeof cx === 'number' ? cx : parseFloat(cx as string) || 0;
  const cyNum = typeof cy === 'number' ? cy : parseFloat(cy as string) || 0;
  const midAngleNum = typeof midAngle === 'number' ? midAngle : 0;
  const outerRadiusNum = typeof outerRadius === 'number' ? outerRadius : 0;

  if (!cantidadVendida || !cxNum || !cyNum || !midAngleNum || !outerRadiusNum) {
    return null;
  }

  const radian = Math.PI / 180;
  const radius = outerRadiusNum + 15;
  const x = cxNum + radius * Math.cos(-midAngleNum * radian);
  const y = cyNum + radius * Math.sin(-midAngleNum * radian);

  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={x > cxNum ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="11"
      fontWeight="600"
    >
      {`${nombreColor} (${((percent ?? 0) * 100).toFixed(0)}%)`}
    </text>
  );
};

