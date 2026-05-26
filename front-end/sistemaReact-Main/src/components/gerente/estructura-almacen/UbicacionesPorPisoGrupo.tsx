import { useState } from 'react';
import type { UbicacionPisoGrupo } from '@/types/EstructuraAlmacen';
import { MaterialIcon } from '@/shared/ui';
import EstadoBadge from './EstadoBadge';
import UbicacionOperativaRow from './UbicacionOperativaRow';
import type { ConfirmDesactivar } from './types';

interface UbicacionesPorPisoGrupoProps {
  grupo: UbicacionPisoGrupo;
  expandidoInicial?: boolean;
  onDesactivar: (c: ConfirmDesactivar) => void;
  onReactivar: (id: number) => void;
  index?: number;
}

function subtituloGrupo(grupo: UbicacionPisoGrupo): string {
  const n = grupo.ubicaciones.length;
  const sectores = `${n} sector${n === 1 ? '' : 'es'}`;
  if (grupo.sectoresConStock > 0) {
    return `${sectores} · ${grupo.sectoresConStock} con inventario`;
  }
  return sectores;
}

const UbicacionesPorPisoGrupo = ({
  grupo,
  expandidoInicial = false,
  onDesactivar,
  onReactivar,
  index = 0,
}: UbicacionesPorPisoGrupoProps) => {
  const [abierto, setAbierto] = useState(expandidoInicial);
  const iconoPiso = grupo.reservado ? 'warehouse' : 'layers';

  return (
    <div
      style={{ '--stagger-index': index } as React.CSSProperties}
      className={`rounded-[24px] overflow-hidden mb-3 animate-stagger-item hover-scale-google app-catalogo-row ${
        grupo.reservado ? 'app-catalogo-row--muted' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4.5 text-left hover:bg-[var(--app-hover-overlay)] transition-all duration-300 ease-[var(--ease-google-emphasized)]"
        title={grupo.reservado ? 'Piso de uso interno del sistema' : undefined}
      >
        <div className="app-catalogo-row-icon w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300">
          <MaterialIcon icon={iconoPiso} className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold app-heading leading-snug">{grupo.nombrePiso}</p>
            <EstadoBadge activo={grupo.pisoActivo} />
            {grupo.reservado && (
              <span className="text-[9px] font-bold uppercase tracking-widest app-text-muted bg-[var(--app-bg-muted)] px-2 py-0.5 rounded-full">
                Reservado
              </span>
            )}
          </div>
          <p className="text-[11px] app-text-muted mt-0.5 font-medium">{subtituloGrupo(grupo)}</p>
        </div>
        <MaterialIcon
          icon="expand_more"
          className={`w-6 h-6 app-text-muted shrink-0 transition-transform duration-350 ease-[var(--ease-google-emphasized)] ${
            abierto ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className={`accordion-wrapper ${abierto ? 'accordion-wrapper-open' : 'accordion-wrapper-closed'}`}>
        <div className="accordion-content">
          <div className="px-4 pb-4 pt-3.5 space-y-2 border-t border-[var(--app-border)] bg-[var(--app-bg-muted)]">
            {grupo.ubicaciones.map((u) => (
              <UbicacionOperativaRow
                key={u.idUbicacionArea}
                ubicacion={u}
                onDesactivar={onDesactivar}
                onReactivar={onReactivar}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UbicacionesPorPisoGrupo;
