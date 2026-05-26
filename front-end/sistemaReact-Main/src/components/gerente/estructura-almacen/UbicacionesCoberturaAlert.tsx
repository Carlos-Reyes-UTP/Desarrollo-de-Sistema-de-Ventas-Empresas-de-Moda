import type { CoberturaUbicaciones } from '@/types/EstructuraAlmacen';
import { MaterialIcon } from '@/shared/ui';

interface UbicacionesCoberturaAlertProps {
  cobertura: CoberturaUbicaciones;
  onAbrirCrear: () => void;
}

const UbicacionesCoberturaAlert = ({ cobertura, onAbrirCrear }: UbicacionesCoberturaAlertProps) => {
  const { combinacionesExistentes, combinacionesPosibles, combinacionesFaltantes } = cobertura;
  const porcentaje =
    combinacionesPosibles > 0
      ? Math.round((combinacionesExistentes / combinacionesPosibles) * 100)
      : 0;

  const subtitulo =
    combinacionesFaltantes === 0
      ? 'Todo listo'
      : combinacionesFaltantes === 1
        ? '1 ubicación por crear — elige piso y sector en el formulario'
        : `${combinacionesFaltantes} ubicaciones por crear — elige piso y sector en el formulario`;

  const pisoLabel = cobertura.pisosActivos === 1 ? 'piso' : 'pisos';
  const sectorLabel = cobertura.sectoresActivos === 1 ? 'sector' : 'sectores';

  return (
    <div className="mx-4 mb-3 rounded-[30px] overflow-hidden shadow-sm border border-[var(--app-metric-border)] bg-[var(--app-metric-bg)] text-[var(--app-metric-text)] animate-slideUpFade px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-[var(--app-surface)] border border-[var(--app-border-strong)] flex items-center justify-center shrink-0 shadow-sm">
            <MaterialIcon icon="add_location_alt" className="w-5 h-5 text-[var(--app-accent)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text)]">
              Configuración · {combinacionesExistentes}/{combinacionesPosibles} completadas
            </p>
            <p className="text-xs text-[var(--app-text-muted)] mt-1 font-medium leading-relaxed">{subtitulo}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <span className="inline-flex px-2.5 py-1 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-[9px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
            {cobertura.pisosActivos} {pisoLabel}
          </span>
          <span className="inline-flex px-2.5 py-1 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-[9px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
            {cobertura.sectoresActivos} {sectorLabel}
          </span>
          <span className="inline-flex px-2.5 py-1 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] text-[9px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
            {combinacionesFaltantes} por crear
          </span>
          {combinacionesFaltantes > 0 && (
            <button
              type="button"
              onClick={onAbrirCrear}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-[30px] text-[9px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95] transition-all duration-200 shadow-sm"
            >
              <MaterialIcon icon="add" className="w-4 h-4" />
              Crear ubicación
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-[var(--app-border-strong)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
};

export default UbicacionesCoberturaAlert;
