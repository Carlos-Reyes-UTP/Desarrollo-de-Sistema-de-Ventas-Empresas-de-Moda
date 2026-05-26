import type { UbicacionOperativa } from '@/types/EstructuraAlmacen';
import { MaterialIcon } from '@/shared/ui';
import EstadoBadge from './EstadoBadge';
import type { ConfirmDesactivar } from './types';

interface UbicacionOperativaRowProps {
  ubicacion: UbicacionOperativa;
  onDesactivar: (c: ConfirmDesactivar) => void;
  onReactivar: (id: number) => void;
}

const UbicacionOperativaRow = ({
  ubicacion: u,
  onDesactivar,
  onReactivar,
}: UbicacionOperativaRowProps) => {
  const etiquetaConfirm = `${u.nombrePiso} · ${u.nombreArea}`;
  const tieneInventario = u.totalUnidades > 0;

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-4 rounded-[20px] hover-scale-google group app-catalogo-row ${
        u.operativa ? '' : 'app-catalogo-row--muted'
      }`}
    >
      <div className="app-catalogo-row-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ease-[var(--ease-google-emphasized)]">
        <MaterialIcon
          icon="category"
          className="w-4 h-4 transition-transform duration-300 ease-[var(--ease-google-emphasized)] group-hover:scale-110"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold app-heading leading-snug truncate">{u.nombreArea}</p>
        <span
          className={`inline-flex mt-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            tieneInventario
              ? 'bg-[var(--app-bg-muted)] text-[var(--app-text)]'
              : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'
          }`}
        >
          {tieneInventario ? 'Con inventario' : 'Vacía'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
        {!u.pisoActivo && (
          <span className="text-[9px] font-bold uppercase tracking-widest app-text-muted bg-[var(--app-bg-muted)] px-2 py-0.5 rounded-full">
            Piso inactivo
          </span>
        )}
        {u.pisoActivo && !u.areaActivo && (
          <span className="text-[9px] font-bold uppercase tracking-widest app-text-muted bg-[var(--app-bg-muted)] px-2 py-0.5 rounded-full">
            Sector inactivo
          </span>
        )}
        <EstadoBadge activo={u.operativa} />
        {u.activo ? (
          <button
            type="button"
            onClick={() =>
              onDesactivar({
                entidad: 'ubicacion',
                id: u.idUbicacionArea,
                nombre: etiquetaConfirm,
                tieneStock: tieneInventario,
              })
            }
            className="app-catalogo-row-action p-2 rounded-[12px] hover-scale-google active:scale-[0.9] transition-all duration-200"
            title="Desactivar"
          >
            <MaterialIcon icon="visibility_off" className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReactivar(u.idUbicacionArea)}
            className="px-2.5 py-1.5 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-[12px] text-[9px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95] transition-all duration-200"
          >
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
};

export default UbicacionOperativaRow;
