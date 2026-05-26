import type {
  CoberturaUbicaciones,
  ResumenGlobalUbicaciones,
  UbicacionPisoGrupo,
} from '@/types/EstructuraAlmacen';
import { ListItemSkeleton, MaterialIcon } from '@/shared/ui';
import UbicacionesResumenBar from './UbicacionesResumenBar';
import UbicacionesCoberturaAlert from './UbicacionesCoberturaAlert';
import UbicacionesPorPisoGrupo from './UbicacionesPorPisoGrupo';
import type { ConfirmDesactivar } from './types';

interface UbicacionesListaProps {
  grupos: UbicacionPisoGrupo[];
  cobertura: CoberturaUbicaciones | null;
  global: ResumenGlobalUbicaciones | null;
  cargando: boolean;
  onCrear: () => void;
  onDesactivar: (c: ConfirmDesactivar) => void;
  onReactivar: (id: number) => void;
}

const UbicacionesLista = ({
  grupos,
  cobertura,
  global,
  cargando,
  onCrear,
  onDesactivar,
  onReactivar,
}: UbicacionesListaProps) => {
  if (cargando) {
    return (
      <div className="p-4">
        <ListItemSkeleton count={6} showAvatar={false} />
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="py-16 px-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-[30px] bg-gray-100 flex items-center justify-center mb-4">
          <MaterialIcon icon="place" className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-bold app-heading">Aún no hay ubicaciones</p>
        <p className="text-xs app-text-muted mt-2 max-w-sm mx-auto">
          Una ubicación une un piso con un sector. Es donde el sistema registrará el inventario.
        </p>
        {cobertura && cobertura.combinacionesFaltantes > 0 && (
          <p className="text-xs app-text-muted mt-3 font-medium">
            Hay {cobertura.combinacionesFaltantes} ubicaciones por crear entre tus pisos y sectores.
          </p>
        )}
        <button
          type="button"
          onClick={onCrear}
          className="mt-6 px-6 py-3 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-[30px] text-[10px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95] transition-all"
        >
          Crear primera ubicación
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {global && cobertura && (
        <>
          <UbicacionesResumenBar global={global} cobertura={cobertura} />
          <UbicacionesCoberturaAlert cobertura={cobertura} onAbrirCrear={onCrear} />
        </>
      )}
      <div className="px-4">
        {grupos.map((grupo, idx) => (
          <UbicacionesPorPisoGrupo
            key={grupo.idUbicacion}
            index={idx}
            grupo={grupo}
            onDesactivar={onDesactivar}
            onReactivar={onReactivar}
          />
        ))}
      </div>
    </div>
  );
};

export default UbicacionesLista;
