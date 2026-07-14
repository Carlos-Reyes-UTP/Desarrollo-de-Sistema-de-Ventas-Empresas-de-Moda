import { MaterialIcon } from '@/shared/ui';

const fmtMoneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export type SignalMatrixCell = {
  id: string;
  label: string;
  value: number;
  deltaPct: number;
  format: 'moneda' | 'entero';
  baseValue?: number;
  baseLabel?: string;
};

interface Props {
  cells: SignalMatrixCell[];
  deltaVsLabel?: string;
}

function DeltaText({ pct, vs }: { pct: number; vs: string }) {
  if (pct === 0) {
    return <span className="report-signal-cell__delta report-signal-cell__delta--flat">· 0% vs {vs}</span>;
  }
  const up = pct > 0;
  return (
    <span
      className={`report-signal-cell__delta inline-flex items-center gap-0.5 ${
        up ? 'report-signal-cell__delta--up' : 'report-signal-cell__delta--down'
      }`}
    >
      <MaterialIcon icon={up ? 'trending_up' : 'trending_down'} className="w-3.5 h-3.5" />
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {pct.toFixed(1)}% vs {vs}
    </span>
  );
}

export function ReportSignalMatrix({ cells, deltaVsLabel = 'ant.' }: Props) {
  const fmt = (c: SignalMatrixCell) =>
    c.format === 'moneda' ? fmtMoneda.format(c.value) : c.value.toLocaleString('es-PE');

  return (
    <section className="report-signal-matrix" aria-label="Métricas del periodo">
      {cells.map((c) => (
        <article key={c.id} className="report-signal-cell">
          <p className="report-signal-cell__label">{c.label}</p>
          {c.baseValue !== undefined && c.baseLabel ? (
            <p className="report-signal-cell__base">
              Base {c.baseLabel}:{' '}
              {c.format === 'moneda'
                ? fmtMoneda.format(c.baseValue)
                : c.baseValue.toLocaleString('es-PE')}
            </p>
          ) : null}
          <p className="report-signal-cell__value">{fmt(c)}</p>
          <DeltaText pct={c.deltaPct} vs={deltaVsLabel} />
        </article>
      ))}
    </section>
  );
}
