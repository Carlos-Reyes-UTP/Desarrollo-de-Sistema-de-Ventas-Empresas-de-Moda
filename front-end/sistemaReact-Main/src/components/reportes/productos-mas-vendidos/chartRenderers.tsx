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

interface CustomPieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  nombreColor?: string;
  cantidadVendida?: number;
  percent?: number;
  // Recharts passes additional data properties via the payload
  [key: string]: unknown;
}

export const CustomTooltip = ({ active, payload }: TooltipProps<ProductoTooltipData>) => {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
      <h4 className="font-semibold text-gray-900 mb-2">{data.nombreProducto}</h4>
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Categoría Principal:</span>{' '}
          {data.categoriaPadre || 'No especificada'}
        </p>
        <p>
          <span className="font-medium">Sub Categoría:</span>{' '}
          {data.categoria || 'No especificada'}
        </p>
        <p>
          <span className="font-medium">Segunda Sub Categoría:</span>{' '}
          {data.subCategoria2 || 'No especificada'}
        </p>
        <p>
          <span className="font-medium">Cantidad Vendida:</span> {data.cantidadVendida}
        </p>
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
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
      <h4 className="font-semibold text-gray-900 mb-2">{data.nombreColor}</h4>
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Cantidad Vendida:</span> {data.cantidadVendida}
        </p>
        <p>
          <span className="font-medium">Stock Actual:</span> {data.cantidadStock}
        </p>
        <p>
          <span className="font-medium">Ingresos:</span> S/{' '}
          {Number(data.ingresosTotales).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export const CustomPieLabel = (props: CustomPieLabelProps) => {
  const { cx, cy, midAngle, outerRadius, nombreColor, cantidadVendida, percent } = props;

  if (!cantidadVendida || !cx || !cy || !midAngle || !outerRadius) {
    return null;
  }

  const radian = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * radian);
  const y = cy + radius * Math.sin(-midAngle * radian);

  return (
    <text
      x={x}
      y={y}
      fill="#000000"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="14"
      fontWeight="600"
    >
      {`${nombreColor}: ${((percent ?? 0) * 100).toFixed(1)}%`}
    </text>
  );
};

