import type { ReactNode } from 'react';
import { MaterialIcon } from '@/shared/ui';

export interface ReportMetricTileProps {
  label: string;
  value: ReactNode;
  icon: string;
  iconIndex?: 1 | 2 | 3 | 4 | 5;
  deltaPct?: number;
  periodHint?: string;
  variant?: 'hero' | 'compact';
}

export const ReportMetricTile = ({
  label,
  value,
  icon,
  iconIndex = 1,
  deltaPct,
  periodHint,
  variant = 'compact',
}: ReportMetricTileProps) => {
  const hasDelta = deltaPct !== undefined && deltaPct !== 0;
  const deltaUp = hasDelta && deltaPct > 0;
  const deltaDown = hasDelta && deltaPct < 0;

  return (
    <div className={`report-metric-tile ${variant === 'hero' ? 'report-metric-tile--hero' : ''}`}>
      <div className="report-metric-tile__head">
        <div className={`report-metric-tile__icon app-metric-icon-${iconIndex}`}>
          <MaterialIcon icon={icon} fill className="w-5 h-5" />
        </div>
        {hasDelta ? (
          <span
            className={`report-delta-pill ${
              deltaUp ? 'report-delta-pill--up' : deltaDown ? 'report-delta-pill--down' : 'report-delta-pill--flat'
            }`}
          >
            {deltaUp ? '↑' : deltaDown ? '↓' : '·'}{' '}
            {Math.abs(deltaPct!).toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p className="report-metric-tile__label">{label}</p>
      <p className="report-metric-tile__value">{value}</p>
      {periodHint ? <p className="report-metric-tile__hint">{periodHint}</p> : null}
    </div>
  );
};
