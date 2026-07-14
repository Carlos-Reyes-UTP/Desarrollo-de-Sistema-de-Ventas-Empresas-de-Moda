import type { DashboardModoMes } from '@/utils/dashboardMes';

export interface DashboardMonthToggleProps {
  value: DashboardModoMes;
  onChange: (modo: DashboardModoMes) => void;
  etiquetaMesActual: string;
  etiquetaMesAnterior: string;
}

export function DashboardMonthToggle({
  value,
  onChange,
  etiquetaMesActual,
  etiquetaMesAnterior,
}: DashboardMonthToggleProps) {
  const btn =
    'px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]';
  const on = 'bg-[var(--app-heading)] text-[var(--app-canvas)]';
  const off = 'app-heading bg-transparent opacity-70 hover:opacity-100';

  return (
    <div
      role="group"
      aria-label="Período del dashboard"
      className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface,var(--app-canvas))]"
    >
      <button
        type="button"
        className={`${btn} ${value === 'actual' ? on : off}`}
        aria-pressed={value === 'actual'}
        onClick={() => onChange('actual')}
      >
        Mes actual
        <span className="ml-1 text-[10px] font-medium opacity-70">{etiquetaMesActual}</span>
      </button>
      <button
        type="button"
        className={`${btn} ${value === 'comparar' ? on : off}`}
        aria-pressed={value === 'comparar'}
        onClick={() => onChange('comparar')}
      >
        vs mes anterior
        <span className="ml-1 text-[10px] font-medium opacity-70">{etiquetaMesAnterior}</span>
      </button>
    </div>
  );
}
