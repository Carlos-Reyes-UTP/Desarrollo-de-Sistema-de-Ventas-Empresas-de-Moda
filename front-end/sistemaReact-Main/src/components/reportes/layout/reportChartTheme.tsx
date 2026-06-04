/** Gradiente Recharts compartido — tokens del tema Dakani. */
export const REPORT_CHART_GRADIENT_ID = 'reportChartGradient';

export const ReportChartGradientDef = () => (
  <defs>
    <linearGradient id={REPORT_CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.95} />
      <stop offset="100%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0.35} />
    </linearGradient>
  </defs>
);

export const reportChartAxisTick = { fontSize: 10, fill: 'var(--app-text-faint)' };

export const reportChartCursor = { fill: 'var(--app-bg-muted)', opacity: 0.5 };

export const reportChartGridStroke = 'var(--app-border)';

/** Colores de leyenda / torta — solo tokens del tema. */
export const CATEGORY_CHART_SLICE_COLORS = [
  'var(--app-accent)',
  'var(--app-metric-icon-2-fg)',
  'var(--app-metric-icon-3-fg)',
  'var(--app-metric-icon-4-fg)',
  'var(--app-metric-icon-1-fg)',
  'var(--app-metric-icon-5-fg)',
];

export function formatterEjeIngresos(valor: number): string {
  if (valor >= 1000) return `S/${(valor / 1000).toFixed(0)}k`;
  return `S/${valor.toFixed(0)}`;
}

const RANKED_BAR_NEUTRAL = [
  'color-mix(in srgb, var(--app-text-faint) 32%, var(--app-bg-muted))',
  'color-mix(in srgb, var(--app-text-faint) 26%, var(--app-bg-muted))',
  'color-mix(in srgb, var(--app-text-faint) 20%, var(--app-bg-muted))',
  'color-mix(in srgb, var(--app-text-faint) 14%, var(--app-bg-muted))',
  'color-mix(in srgb, var(--app-text-faint) 10%, var(--app-bg-muted))',
];

export function getBarFillForIndex(index: number, highlightFirst = true): string {
  if (highlightFirst && index === 0) return 'var(--app-accent)';
  return RANKED_BAR_NEUTRAL[Math.min(index - (highlightFirst ? 1 : 0), RANKED_BAR_NEUTRAL.length - 1)] ?? RANKED_BAR_NEUTRAL[0];
}

export function truncateCategoryLabel(label: string, max = 14): string {
  if (!label || label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}
