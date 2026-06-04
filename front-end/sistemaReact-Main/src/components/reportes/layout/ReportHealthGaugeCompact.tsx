interface ReportHealthGaugeCompactProps {
  score: number;
  headline: string;
  summary: string;
}

const R = 52;
const CX = 80;
const CY = 78;
const ARC_LEN = Math.PI * R;

export const ReportHealthGaugeCompact = ({ score, headline, summary }: ReportHealthGaugeCompactProps) => {
  const pct = Math.min(100, Math.max(0, score));
  const filled = (pct / 100) * ARC_LEN;

  return (
    <div className="report-health-compact">
      <div className="report-health-compact__gauge">
        <svg viewBox="0 0 160 100" className="w-full max-w-[160px] mx-auto" aria-hidden>
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--app-bg-muted)"
            strokeWidth="10"
            pathLength={ARC_LEN}
          />
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--app-accent)"
            strokeWidth="10"
            strokeLinecap="round"
            pathLength={ARC_LEN}
            strokeDasharray={`${filled} ${ARC_LEN}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <div className="report-health-compact__score-wrap">
          <span className="report-health-compact__score">{score}</span>
          <span className="report-health-compact__label">Salud comercial</span>
        </div>
      </div>
      <div className="report-health-compact__copy min-w-0">
        <p className="report-health-compact__headline">{headline}</p>
        <p className="report-health-compact__summary">{summary}</p>
      </div>
    </div>
  );
};
