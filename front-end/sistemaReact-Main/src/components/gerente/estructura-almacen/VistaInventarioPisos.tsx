import GestionPisos from '@/components/almacen/GestionPisos';
import { MaterialIcon } from '@/shared/ui';

interface VistaInventarioPisosProps {
  refreshKey: number;
  onVolver: () => void;
}

const VistaInventarioPisos = ({ refreshKey, onVolver }: VistaInventarioPisosProps) => (
  <div className="w-full min-w-0">
    <button
      type="button"
      onClick={onVolver}
      className="mb-6 inline-flex min-h-11 items-center gap-3 text-sm font-bold text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover-scale-google transition-all"
    >
      <span className="w-9 h-9 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-fg)] flex items-center justify-center transition-all duration-300">
        <MaterialIcon icon="arrow_back" className="w-4 h-4" />
      </span>
      Volver al catálogo
    </button>
    <GestionPisos embedded puedeTrasladar={false} variant="gerente" refreshKey={refreshKey} />
  </div>
);

export default VistaInventarioPisos;
