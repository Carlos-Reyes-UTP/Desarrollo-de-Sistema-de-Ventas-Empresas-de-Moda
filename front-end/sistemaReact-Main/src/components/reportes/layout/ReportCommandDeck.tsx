import { MaterialIcon } from '@/shared/ui';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { PERIODOS_REPORTE } from '@/components/reportes/hooks/useReportPeriod';
import { ReportCompareMonthPickers } from '@/components/reportes/layout/ReportCompareMonthPickers';
import type { ReportTabConfig } from '@/components/reportes/layout/ReportPageShell';

interface ReportCommandDeckProps {
  tabs: ReportTabConfig[];
  tabActiva: string;
  onTabChange: (id: string) => void;
}

export const ReportCommandDeck = ({ tabs, tabActiva, onTabChange }: ReportCommandDeckProps) => {
  const {
    periodo,
    setPeriodo,
    modo,
    setModo,
    mesBase,
    setMesBase,
    mesComparar,
    setMesComparar,
    swapMeses,
    mesesIguales,
    etiqueta,
  } = useReportPeriodContext();
  const { actions } = useReportPageActions();
  const tabMeta = tabs.find((t) => t.id === tabActiva);
  const esResumen = tabActiva === 'resumen';
  const esVentas = tabActiva === 'ventas';
  const comparando = esResumen && modo === 'comparar';

  return (
    <header className="reports-analytics__command-deck sticky top-2 z-40">
      <div className="report-command-deck__top">
        <div className="min-w-0">
          <p className="report-command-deck__eyebrow">
            {esResumen
              ? 'DK · Reportes · Resumen'
              : esVentas
                ? 'DK · Reportes · Ventas'
                : 'Análisis comercial'}
          </p>
          <div className="flex items-center gap-3 min-w-0">
            <span className="report-command-deck__icon-wrap" aria-hidden>
              <MaterialIcon icon={esVentas ? 'bar_chart' : 'analytics'} className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="report-command-deck__title">
                {comparando
                  ? 'Comparar meses'
                  : esResumen
                    ? 'Ritmo del negocio'
                    : esVentas
                      ? 'Detalle de ventas'
                      : 'Reportes'}
              </h1>
              {esResumen ? (
                <p className="report-command-deck__period-hint">{etiqueta}</p>
              ) : tabMeta?.descripcion ? (
                <p className="report-command-deck__period-hint">{tabMeta.descripcion}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="report-command-deck__actions">
          {esResumen ? (
            comparando ? (
              <button
                type="button"
                className="report-resumen-compare-btn report-resumen-compare-btn--ghost"
                onClick={() => setModo('rapido')}
              >
                <MaterialIcon icon="arrow_back" className="w-4 h-4" />
                Volver al resumen
              </button>
            ) : (
              <button
                type="button"
                className="report-resumen-compare-btn"
                onClick={() => setModo('comparar')}
              >
                <MaterialIcon icon="compare_arrows" className="w-4 h-4" />
                Comparar meses
              </button>
            )
          ) : null}
          {actions}
        </div>
      </div>

      {esResumen ? (
        <div className="report-resumen-filters" aria-label="Filtros del resumen">
          {comparando ? (
            <ReportCompareMonthPickers
              mesBase={mesBase}
              mesComparar={mesComparar}
              onMesBaseChange={setMesBase}
              onMesCompararChange={setMesComparar}
              onSwap={swapMeses}
              mesesIguales={mesesIguales}
            />
          ) : (
            <div className="report-period-switch" role="group" aria-label="Período">
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
        </div>
      ) : null}

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
