import { MaterialIcon } from '@/shared/ui';

interface ReportInsightBannerProps {
  message: string;
  headline?: string;
  icon?: string;
  /** Índice salud 0–100 (chip opcional) */
  scoreChip?: number;
}

export const ReportInsightBanner = ({
  message,
  headline,
  icon = 'lightbulb',
  scoreChip,
}: ReportInsightBannerProps) => (
  <div className="report-insight-hero flex gap-4 items-start">
    <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)]">
      <MaterialIcon icon={icon} className="w-5 h-5 text-[var(--app-accent)]" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        {headline ? (
          <p className="text-sm font-black uppercase tracking-[0.15em] app-heading">{headline}</p>
        ) : null}
        {scoreChip !== undefined ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tabular-nums border border-[color-mix(in_srgb,var(--app-accent)_40%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent)]">
            <MaterialIcon icon="monitoring" className="w-3.5 h-3.5" />
            {scoreChip}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium app-text-muted leading-relaxed">{message}</p>
    </div>
  </div>
);
