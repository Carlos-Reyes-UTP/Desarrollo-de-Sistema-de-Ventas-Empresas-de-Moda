import { MaterialIcon } from '@/shared/ui';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { PERIODOS_REPORTE } from '@/components/reportes/hooks/useReportPeriod';
import type { ReportTabConfig } from '@/components/reportes/layout/ReportPageShell';

interface ReportCommandDeckProps {
  tabs: ReportTabConfig[];
  tabActiva: string;
  onTabChange: (id: string) => void;
}

export const ReportCommandDeck = ({ tabs, tabActiva, onTabChange }: ReportCommandDeckProps) => {
  const { periodo, setPeriodo, etiqueta } = useReportPeriodContext();
  const { actions } = useReportPageActions();
  const tabMeta = tabs.find((t) => t.id === tabActiva);

  return (
    <header className="reports-analytics__command-deck sticky top-2 z-40">
      <div className="report-command-deck__top">
        <div className="min-w-0">
          <p className="report-command-deck__eyebrow">Análisis comercial</p>
          <div className="flex items-center gap-3 min-w-0">
            <span className="report-command-deck__icon-wrap" aria-hidden>
              <MaterialIcon icon="analytics" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="report-command-deck__title">Reportes</h1>
              {tabActiva === 'resumen' && <p className="report-command-deck__period-hint">{etiqueta}</p>}
            </div>
          </div>
        </div>

        <div className="report-command-deck__controls">
          {tabActiva === 'resumen' && (
          <div className="report-period-switch" role="group" aria-label="Período de análisis">
            {PERIODOS_REPORTE.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={`report-period-switch__btn ${
                  periodo === p.id ? 'report-period-switch__btn--active' : ''
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          )}
          {actions ? <div className="report-command-deck__actions">{actions}</div> : null}
        </div>
      </div>

      <div className="report-command-deck__nav-row">
        <nav className="reports-analytics__segmented" aria-label="Secciones de reportes">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`report-segmented-tab ${
                tabActiva === tab.id ? 'report-segmented-tab--active' : ''
              }`}
            >
              <MaterialIcon icon={tab.icon} className="w-5 h-5" />
              {tab.nombre}
            </button>
          ))}
        </nav>
        {tabMeta?.descripcion ? (
          <p className="report-command-deck__meta">{tabMeta.descripcion}</p>
        ) : null}
      </div>
    </header>
  );
};
