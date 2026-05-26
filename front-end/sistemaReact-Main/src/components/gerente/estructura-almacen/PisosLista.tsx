import type { Piso } from '@/types/EstructuraAlmacen';
import { ListItemSkeleton, MaterialIcon } from '@/shared/ui';
import CatalogoListaItem from './CatalogoListaItem';
import type { ConfirmDesactivar } from './types';

interface PisosListaProps {
  pisos: Piso[];
  cargando: boolean;
  onCrear: () => void;
  onEditar: (p: Piso) => void;
  onDesactivar: (c: ConfirmDesactivar) => void;
  onReactivar: (id: number) => void;
}

const PisosLista = ({
  pisos,
  cargando,
  onCrear,
  onEditar,
  onDesactivar,
  onReactivar,
}: PisosListaProps) => {
  if (cargando) {
    return (
      <div className="p-4">
        <ListItemSkeleton count={5} showAvatar={false} />
      </div>
    );
  }

  if (pisos.length === 0) {
    return (
      <div className="py-16 px-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <MaterialIcon icon="layers" className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-900">Aún no hay pisos registrados</p>
        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
          Cree el primer piso físico del local antes de armar sectores y ubicaciones.
        </p>
        <button
          type="button"
          onClick={onCrear}
          className="mt-6 px-6 py-3 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google active:scale-[0.95] transition-all"
        >
          Crear primer piso
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {pisos.map((p, idx) => (
        <CatalogoListaItem
          key={p.idUbicacion}
          index={idx}
          titulo={p.nombre}
          subtitulo={p.reservado ? 'Uso interno del sistema (almacén central)' : undefined}
          activo={p.activo}
          icono="layers"
          onEditar={() => onEditar(p)}
          onDesactivar={
            p.activo
              ? () =>
                  onDesactivar({
                    entidad: 'piso',
                    id: p.idUbicacion,
                    nombre: p.nombre,
                  })
              : undefined
          }
          onReactivar={!p.activo ? () => onReactivar(p.idUbicacion) : undefined}
        />
      ))}
    </div>
  );
};

export default PisosLista;
