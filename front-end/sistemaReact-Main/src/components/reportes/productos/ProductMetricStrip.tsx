import { ReportMetricTile } from '@/components/reportes/layout/ReportMetricTile';

interface ProductMetricStripProps {
  enRanking: number;
  unidades: number;
  ingresos: number;
  precioPromedio: number;
}

const fmtMoney = (v: number) =>
  `S/ ${v.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;

export function ProductMetricStrip({
  enRanking,
  unidades,
  ingresos,
  precioPromedio,
}: ProductMetricStripProps) {
  return (
    <section className="product-report-metric-strip" aria-label="Métricas del mix">
      <div className="product-report-metric-strip__grid product-report-stagger">
        <div className="product-report-stagger__item" style={{ ['--pr-i' as string]: 0 }}>
          <ReportMetricTile label="En ranking" value={enRanking.toLocaleString('es-PE')} icon="inventory_2" iconIndex={1} />
        </div>
        <div className="product-report-stagger__item" style={{ ['--pr-i' as string]: 1 }}>
          <ReportMetricTile label="Unidades" value={unidades.toLocaleString('es-PE')} icon="shopping_bag" iconIndex={2} />
        </div>
        <div className="product-report-stagger__item" style={{ ['--pr-i' as string]: 2 }}>
          <ReportMetricTile label="Ingresos" value={fmtMoney(ingresos)} icon="payments" iconIndex={3} />
        </div>
        <div className="product-report-stagger__item" style={{ ['--pr-i' as string]: 3 }}>
          <ReportMetricTile
            label="Precio prom."
            value={fmtMoney(precioPromedio)}
            icon="sell"
            iconIndex={4}
          />
        </div>
      </div>
    </section>
  );
}
