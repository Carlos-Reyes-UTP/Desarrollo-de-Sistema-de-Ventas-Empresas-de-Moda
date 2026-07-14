import { MaterialIcon } from '@/shared/ui';
import {
  listarMesesHastaHoy,
  mesRefToKey,
  etiquetaMesUi,
  type MesRef,
} from '@/utils/reportesCompararMeses';

interface ReportCompareMonthPickersProps {
  mesBase: MesRef;
  mesComparar: MesRef;
  onMesBaseChange: (m: MesRef) => void;
  onMesCompararChange: (m: MesRef) => void;
  onSwap: () => void;
  mesesIguales: boolean;
}

export const ReportCompareMonthPickers = ({
  mesBase,
  mesComparar,
  onMesBaseChange,
  onMesCompararChange,
  onSwap,
  mesesIguales,
}: ReportCompareMonthPickersProps) => {
  const opciones = listarMesesHastaHoy(24);

  const onSelect = (which: 'base' | 'comparar', key: string) => {
    const found = opciones.find((o) => mesRefToKey(o) === key);
    if (!found) return;
    if (which === 'base') onMesBaseChange(found);
    else onMesCompararChange(found);
  };

  return (
    <div
      className={`report-compare-toolbar ${mesesIguales ? 'report-compare-toolbar--invalid' : ''}`}
      role="group"
      aria-label="Meses a comparar"
    >
      <label className="report-compare-field report-compare-field--base">
        <span className="report-compare-field__label">
          <span className="report-compare-dot report-compare-dot--base" aria-hidden />
          Base
        </span>
        <select
          className="report-compare-field__select"
          value={mesRefToKey(mesBase)}
          onChange={(e) => onSelect('base', e.target.value)}
          aria-invalid={mesesIguales}
        >
          {opciones.map((o) => (
            <option key={`base-${mesRefToKey(o)}`} value={mesRefToKey(o)}>
              {etiquetaMesUi(o)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="report-compare-swap-btn"
        onClick={onSwap}
        title="Invertir meses"
        aria-label="Invertir base y actual"
      >
        <MaterialIcon icon="swap_horiz" className="w-4 h-4" />
      </button>

      <label className="report-compare-field report-compare-field--focus">
        <span className="report-compare-field__label">
          <span className="report-compare-dot report-compare-dot--focus" aria-hidden />
          Actual
        </span>
        <select
          className="report-compare-field__select"
          value={mesRefToKey(mesComparar)}
          onChange={(e) => onSelect('comparar', e.target.value)}
          aria-invalid={mesesIguales}
        >
          {opciones.map((o) => (
            <option key={`cmp-${mesRefToKey(o)}`} value={mesRefToKey(o)}>
              {etiquetaMesUi(o)}
            </option>
          ))}
        </select>
      </label>

      {mesesIguales ? (
        <span className="report-compare-toolbar__hint" role="status">
          Elige meses distintos
        </span>
      ) : null}
    </div>
  );
};
