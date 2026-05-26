import type { AreaCatalogo } from '@/types/EstructuraAlmacen';
import { ListItemSkeleton, MaterialIcon } from '@/shared/ui';
import CatalogoListaItem from './CatalogoListaItem';
import type { ConfirmDesactivar } from './types';

interface SectoresListaProps {
  sectores: AreaCatalogo[];
  cargando: boolean;
  onCrear: () => void;
  onEditar: (a: AreaCatalogo) => void;
  onDesactivar: (c: ConfirmDesactivar) => void;
  onReactivar: (id: number) => void;
}

const SectoresLista = ({
  sectores,
  cargando,
  onCrear,
  onEditar,
  onDesactivar,
  onReactivar,
}: SectoresListaProps) => {
  if (cargando) {
    return (
      <div className="p-4">
        <ListItemSkeleton count={5} showAvatar={false} />
      </div>
    );
  }

  if (sectores.length === 0) {
    return (
      <div className="py-16 px-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <MaterialIcon icon="category" className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-900">Aún no hay sectores</p>
        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
          Los sectores agrupan el catálogo (Damas, Caballeros, etc.) y se combinan con cada piso.
        </p>
        <button
          type="button"
          onClick={onCrear}
          className="mt-6 px-6 py-3 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95] transition-all"
        >
          Crear primer sector
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {sectores.map((a, idx) => (
        <CatalogoListaItem
          key={a.idArea}
          index={idx}
          titulo={a.nombre}
          activo={a.activo}
          icono="category"
          onEditar={() => onEditar(a)}
          onDesactivar={
            a.activo
              ? () =>
                  onDesactivar({
                    entidad: 'sector',
                    id: a.idArea,
                    nombre: a.nombre,
                  })
              : undefined
          }
          onReactivar={!a.activo ? () => onReactivar(a.idArea) : undefined}
        />
      ))}
    </div>
  );
};

export default SectoresLista;
