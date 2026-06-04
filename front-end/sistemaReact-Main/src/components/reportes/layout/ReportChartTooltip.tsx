import type { ReactNode } from 'react';

interface ReportChartTooltipRow {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
}

interface ReportChartTooltipProps {
  title?: string;
  rows: ReportChartTooltipRow[];
}

export const ReportChartTooltip = ({ title, rows }: ReportChartTooltipProps) => (
  <div className="app-chart-tooltip backdrop-blur-md p-3 rounded-xl min-w-[160px] max-w-xs">
    {title ? (
      <p className="font-semibold text-[10px] tracking-wider uppercase truncate mb-2 border-b border-[var(--app-border)] pb-2">
        {title}
      </p>
    ) : null}
    <div className="space-y-1.5 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3 items-center">
          <span className="app-chart-tooltip-muted shrink-0">{row.label}</span>
          <span
            className={
              row.emphasize ? 'font-bold app-chart-tooltip-accent tabular-nums' : 'font-semibold app-heading tabular-nums'
            }
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);
