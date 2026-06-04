interface CommercialHealthGaugeProps {
  score: number;
  summary?: string;
}

const R = 72;
const CX = 100;
const CY = 95;
/** Longitud del arco semicircular (pathLength normalizado) */
const ARC_LEN = Math.PI * R;

export const CommercialHealthGauge = ({ score, summary }: CommercialHealthGaugeProps) => {
  const pct = Math.min(100, Math.max(0, score));
  const filled = (pct / 100) * ARC_LEN;

  return (
    <div className="flex flex-col items-center text-center h-full justify-center py-4">
      <div className="relative w-full max-w-[240px]">
        <svg viewBox="0 0 200 120" className="w-full" aria-hidden>
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--app-bg-muted)"
            strokeWidth="12"
            pathLength={ARC_LEN}
          />
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--app-accent)"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength={ARC_LEN}
            strokeDasharray={`${filled} ${ARC_LEN}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
          <p className="text-4xl font-black tabular-nums app-heading leading-none">{score}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] app-text-faint mt-1">
            Índice salud comercial
          </p>
        </div>
      </div>
      {summary ? (
        <p className="text-xs app-text-muted mt-4 px-3 leading-relaxed max-w-sm">{summary}</p>
      ) : null}
    </div>
  );
};
