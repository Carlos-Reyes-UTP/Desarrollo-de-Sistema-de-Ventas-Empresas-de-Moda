import type { ReactNode } from 'react';
import { MaterialIcon } from '@/shared/ui';

export interface DashboardMetricCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: string;
  /** Tailwind bg color for the tonal container, e.g. "bg-blue-100" */
  iconWrapClassName?: string;
  /** Tailwind text color for the icon, e.g. "text-blue-600" */
  iconClassName?: string;
  /** Optional theme-adapted icon index (1 to 5) */
  iconIndex?: 1 | 2 | 3 | 4 | 5;
  /** Delta vs mes anterior, e.g. "+8.2%" */
  deltaLabel?: string | null;
  deltaTone?: 'up' | 'down' | 'flat';
}

export const DashboardMetricCard = ({
  label,
  value,
  sub,
  icon,
  iconWrapClassName = 'bg-indigo-100',
  iconClassName = 'text-indigo-600',
  iconIndex,
  deltaLabel,
  deltaTone = 'flat',
}: DashboardMetricCardProps) => (
  <div className="app-metric-card group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all hover:-translate-y-2 text-left">
    <div className="app-metric-card-glow absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" />

    <div className="relative z-10 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div
          className={`h-14 w-14 rounded-full flex items-center justify-center ${
            iconIndex ? `app-metric-icon-${iconIndex}` : iconWrapClassName
          }`}
        >
          <MaterialIcon
            icon={icon}
            fill
            className={`w-6 h-6 ${iconIndex ? '' : iconClassName}`}
          />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] app-metric-label mb-1">
            {label}
          </p>
          <p className="text-4xl font-black tabular-nums app-metric-value leading-none">{value}</p>
          {deltaLabel ? (
            <p
              className={`mt-2 text-xs font-bold tabular-nums ${
                deltaTone === 'up'
                  ? 'text-emerald-800/80'
                  : deltaTone === 'down'
                    ? 'text-orange-900/70'
                    : 'app-metric-label opacity-60'
              }`}
            >
              {deltaLabel}
            </p>
          ) : null}
        </div>
      </div>
      {sub ? (
        <p className="mt-6 text-sm font-bold app-metric-label opacity-60 tracking-tight">{sub}</p>
      ) : null}
    </div>
  </div>
);

