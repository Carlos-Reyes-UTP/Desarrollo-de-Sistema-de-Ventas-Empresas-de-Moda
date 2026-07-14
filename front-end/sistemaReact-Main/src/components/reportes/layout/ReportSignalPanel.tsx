import { useEffect, useId, useRef, useState } from 'react';
import { MaterialIcon } from '@/shared/ui';
import type { ReportSignalView } from '@/utils/reportSignal';

interface Props {
  signal: ReportSignalView;
  deltaVsLabel?: string;
}

export function ReportSignalPanel({ signal, deltaVsLabel = 'ant.' }: Props) {
  const delta = signal.leadDelta;
  const up = delta && delta.pct > 0;
  const down = delta && delta.pct < 0;
  const tooltipId = useId();
  const [basisOpen, setBasisOpen] = useState(false);
  const basisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!basisOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (basisRef.current && !basisRef.current.contains(e.target as Node)) {
        setBasisOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBasisOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [basisOpen]);

  return (
    <section
      className={`report-signal-panel report-signal-panel--${signal.tone}`}
      role="status"
      aria-label={`Señal del periodo: ${signal.label}`}
    >
      <div className="report-signal-panel__eyebrow-row">
        <p className="report-signal-panel__eyebrow">
          {signal.contextLabel ? `Señal · ${signal.contextLabel}` : 'Señal del periodo'}
        </p>
        <div className="report-signal-panel__basis" ref={basisRef}>
          <button
            type="button"
            className="report-signal-panel__basis-btn"
            aria-expanded={basisOpen}
            aria-controls={tooltipId}
            onClick={() => setBasisOpen((v) => !v)}
          >
            <MaterialIcon icon="info" className="w-3.5 h-3.5" />
            <span>¿Por qué?</span>
          </button>
          {basisOpen ? (
            <div
              id={tooltipId}
              role="dialog"
              aria-label={signal.basisTitle}
              className="report-signal-panel__basis-tip"
            >
              <p className="report-signal-panel__basis-title">{signal.basisTitle}</p>
              {signal.basisLead ? (
                <p className="report-signal-panel__basis-lead">{signal.basisLead}</p>
              ) : null}
              <ul className="report-signal-panel__basis-list">
                {signal.basisItems.map((item) => (
                  <li key={item.label}>
                    <span className="report-signal-panel__basis-label">{item.label}</span>
                    <span className="report-signal-panel__basis-detail">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <h2 className="report-signal-panel__label">{signal.label}</h2>
      <p className="report-signal-panel__summary">{signal.summary}</p>
      {delta ? (
        <span
          className={`report-delta-chip mt-3.5 ${
            up ? 'report-delta-chip--up' : down ? 'report-delta-chip--down' : 'report-delta-chip--flat'
          }`}
        >
          <MaterialIcon
            icon={up ? 'trending_up' : down ? 'trending_down' : 'remove'}
            className="w-3.5 h-3.5"
          />
          {delta.label} {up ? '+' : ''}
          {delta.pct.toFixed(1)}% vs {deltaVsLabel}
        </span>
      ) : null}
    </section>
  );
}
