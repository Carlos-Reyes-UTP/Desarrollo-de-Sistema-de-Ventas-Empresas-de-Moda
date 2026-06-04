import { MaterialIcon } from '@/shared/ui';
import type { ReportDriver } from '@/utils/reportInsights';

interface ReportDriverCardsProps {
  drivers: ReportDriver[];
}

function parsePctFromSub(sub?: string): number | null {
  if (!sub) return null;
  const m = sub.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Math.min(100, parseFloat(m[1])) : null;
}

export const ReportDriverCards = ({ drivers }: ReportDriverCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {drivers.map((d) => {
      const pct = parsePctFromSub(d.sub);
      return (
        <div key={d.id} className="report-driver-card flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)]">
              <MaterialIcon icon={d.icon} className="w-4 h-4 text-[var(--app-accent)]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] app-text-faint">{d.label}</span>
          </div>
          <p className="text-base font-black app-heading truncate leading-tight" title={d.value}>
            {d.value}
          </p>
          {d.sub ? (
            <div className="flex items-end justify-between gap-2">
              <p className="text-xs font-bold app-text-muted">{d.sub}</p>
              {pct !== null ? (
                <span className="text-lg font-black tabular-nums text-[var(--app-accent)] leading-none">{pct}%</span>
              ) : null}
            </div>
          ) : null}
          {pct !== null ? (
            <div className="report-driver-card__bar" aria-hidden>
              <div className="report-driver-card__bar-fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);
