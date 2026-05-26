import type { ReactNode } from 'react';
import { MaterialIcon } from '@/shared/ui';
import EstadoBadge from './EstadoBadge';

export interface CatalogoListaItemProps {
  titulo: string;
  subtitulo?: string;
  activo: boolean;
  icono: string;
  onEditar?: () => void;
  onDesactivar?: () => void;
  onReactivar?: () => void;
  accionExtra?: ReactNode;
  index?: number;
}

const CatalogoListaItem = ({
  titulo,
  subtitulo,
  activo,
  icono,
  onEditar,
  onDesactivar,
  onReactivar,
  accionExtra,
  index = 0,
}: CatalogoListaItemProps) => (
  <div
    style={{ '--stagger-index': index } as React.CSSProperties}
    className={`flex items-center justify-between gap-4 py-3.5 px-5 mb-2.5 rounded-[24px] animate-stagger-item hover-scale-google group app-catalogo-row ${
      activo ? '' : 'app-catalogo-row--muted'
    }`}
  >
    <div className="flex items-center gap-4 min-w-0 flex-1">
      <div
        className={`app-catalogo-row-icon w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 transition-all duration-300 ease-[var(--ease-google-emphasized)] ${
          activo ? '' : 'opacity-60'
        }`}
      >
        <MaterialIcon
          icon={icono}
          className="w-5 h-5 transition-transform duration-300 ease-[var(--ease-google-emphasized)] group-hover:scale-110"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-bold app-heading leading-snug">{titulo}</p>
        {subtitulo && (
          <p className="text-[10px] font-medium app-text-muted mt-0.5 tracking-wide truncate">
            {subtitulo}
          </p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <EstadoBadge activo={activo} />
      {accionExtra}
      <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-[var(--ease-google-emphasized)]">
        {activo && onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="app-catalogo-row-action p-2.5 rounded-[14px] hover-scale-google active:scale-[0.9] transition-all"
            title="Editar"
          >
            <MaterialIcon icon="edit" className="w-4 h-4" />
          </button>
        )}
        {activo && onDesactivar && (
          <button
            type="button"
            onClick={onDesactivar}
            className="app-catalogo-row-action p-2.5 rounded-[14px] hover-scale-google active:scale-[0.9] transition-all"
            title="Desactivar"
          >
            <MaterialIcon icon="visibility_off" className="w-4 h-4" />
          </button>
        )}
        {!activo && onReactivar && (
          <button
            type="button"
            onClick={onReactivar}
            className="px-3.5 py-2 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-[14px] text-[10px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95]"
          >
            Reactivar
          </button>
        )}
      </div>
    </div>
  </div>
);

export default CatalogoListaItem;
