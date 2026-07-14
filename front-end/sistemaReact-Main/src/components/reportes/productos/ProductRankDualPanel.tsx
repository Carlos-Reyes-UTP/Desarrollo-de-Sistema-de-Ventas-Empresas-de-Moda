import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { VarianteMasVendida } from '@/types/ReporteVentas';
import { CustomTooltip } from '@/components/reportes/productos-mas-vendidos/chartRenderers';
import { formatVarianteLabel } from '@/utils/reportProductRank';

interface ProductRankDualPanelProps {
  top10: VarianteMasVendida[];
  bottom10: VarianteMasVendida[];
  totalCount: number;
  onSelect?: (variante: VarianteMasVendida) => void;
}

const LEADER_FILLS = ['#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#6b7280', '#9ca3af', '#9ca3af', '#d1d5db', '#e5e7eb'];
const RISK_FILLS = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#fecdd3', '#ffe4e6', '#ffe4e6', '#fff1f2', '#fff1f2'];

type ChartRow = VarianteMasVendida & { etiqueta: string };

function RankColumn({
  title,
  subtitle,
  items,
  variant,
  emptyMessage,
  onSelect,
}: {
  title: string;
  subtitle: string;
  items: VarianteMasVendida[];
  variant: 'leaders' | 'risk';
  emptyMessage: string;
  onSelect?: (variante: VarianteMasVendida) => void;
}) {
  const fills = variant === 'leaders' ? LEADER_FILLS : RISK_FILLS;
  const chartData: ChartRow[] = items.map((v) => ({ ...v, etiqueta: formatVarianteLabel(v) }));
  const maxUnits = Math.max(...items.map((p) => p.cantidadVendida), 1);

  return (
    <article className={`product-report-rank-panel product-report-rank-panel--${variant}`}>
      <header className="product-report-rank-panel__head">
        <div>
          <h3 className="product-report-rank-panel__title">{title}</h3>
          <p className="product-report-rank-panel__sub">{subtitle}</p>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="product-report-rank-panel__empty">{emptyMessage}</p>
      ) : (
        <>
          <div className="product-report-rank-panel__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 4 }}>
                <XAxis type="number" hide domain={[0, maxUnits]} />
                <YAxis type="category" dataKey="etiqueta" hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--app-bg-muted)' }} />
                <Bar dataKey="cantidadVendida" radius={[0, 4, 4, 0]} barSize={12}>
                  {items.map((_, index) => (
                    <Cell key={`cell-${variant}-${index}`} fill={fills[index] ?? fills[fills.length - 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="product-report-rank-list product-report-stagger">
            {items.map((variante, index) => {
              const label = formatVarianteLabel(variante);
              return (
                <li
                  key={variante.idProductoVariante}
                  className="product-report-rank-list__item product-report-stagger__item"
                  style={{ ['--pr-i' as string]: index }}
                >
                  <button
                    type="button"
                    className="product-report-rank-list__row"
                    onClick={() => onSelect?.(variante)}
                  >
                    <span
                      className={`product-report-rank-list__rank ${
                        variant === 'risk' ? 'product-report-rank-list__rank--risk' : ''
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="product-report-rank-list__name" title={label}>
                      {label}
                    </span>
                    <span className="product-report-rank-list__units">
                      {variante.cantidadVendida.toLocaleString('es-PE')} uds
                    </span>
                    <span className="product-report-rank-list__money">
                      S/ {variante.ingresosTotales.toLocaleString('es-PE')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </article>
  );
}

export function ProductRankDualPanel({ top10, bottom10, totalCount, onSelect }: ProductRankDualPanelProps) {
  return (
    <section className="product-report-dual" aria-label="Ranking de variantes">
      <RankColumn
        title="Líderes · Top 10"
        subtitle="Variantes con mayor rotación (unidades)"
        items={top10}
        variant="leaders"
        emptyMessage="No hay variantes vendidas en el período"
        onSelect={onSelect}
      />
      <RankColumn
        title="Baja rotación · Bottom 10"
        subtitle="Variantes con menor volumen"
        items={bottom10}
        variant="risk"
        emptyMessage={
          totalCount <= 10
            ? 'Se requieren más de 10 variantes para mostrar baja rotación'
            : 'No hay datos disponibles'
        }
        onSelect={onSelect}
      />
    </section>
  );
}
