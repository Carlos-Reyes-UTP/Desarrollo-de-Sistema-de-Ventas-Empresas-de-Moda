import {
  ConfirmModal,
  MaterialIcon,
  PageActionButton,
  PageActionGroup,
  PageHeader,
} from '@/shared/ui';
import PisosLista from './PisosLista';
import SectoresLista from './SectoresLista';
import UbicacionesLista from './UbicacionesLista';
import FormPisoSectorModal from './FormPisoSectorModal';
import FormUbicacionModal from './FormUbicacionModal';
import VistaInventarioPisos from './VistaInventarioPisos';
import { useEstructuraAlmacen } from './useEstructuraAlmacen';
import type { CatalogoTab } from './types';
import type { AreaCatalogo, Piso } from '@/types/EstructuraAlmacen';

const TABS: { id: CatalogoTab; label: string; icon: string }[] = [
  { id: 'pisos', label: 'Pisos', icon: 'layers' },
  { id: 'sectores', label: 'Sectores', icon: 'category' },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: 'place' },
];

const EstructuraAlmacenView = () => {
  const h = useEstructuraAlmacen();

  const tituloCrear =
    h.tab === 'pisos'
      ? 'Nuevo piso'
      : h.tab === 'sectores'
        ? 'Nuevo sector'
        : 'Nueva ubicación';

  const onCrear = () => {
    if (h.tab === 'pisos') {
      h.setFormPisoSector({ tipo: 'piso', modo: 'crear', nombre: '' });
    } else if (h.tab === 'sectores') {
      h.setFormPisoSector({ tipo: 'sector', modo: 'crear', nombre: '' });
    } else {
      void h.abrirModalUbicacion();
    }
  };

  const confirmMessage = h.confirmDesactivar
    ? h.confirmDesactivar.tieneStock
      ? `¿Desactivar "${h.confirmDesactivar.nombre}"? Puede tener inventario histórico asociado; dejará de usarse en operaciones nuevas.`
      : `¿Desactivar "${h.confirmDesactivar.nombre}"? Dejará de aparecer en operaciones del almacén.`
    : '';

  return (
    <div className="app-page p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen animate-fadeIn text-left">
      <PageHeader
        surface="elevated"
        eyebrow="Gerencia · Almacén"
        title={h.vista === 'catalogo' ? 'Estructura del almacén' : 'Inventario por piso'}
        subtitle={
          h.vista === 'catalogo'
            ? 'Configure pisos, sectores y ubicaciones. El inventario se consulta por separado.'
            : 'Consulta de stock agrupado por piso (solo lectura).'
        }
        actions={
          h.vista === 'catalogo' ? (
            <PageActionGroup>
              <PageActionButton grouped variant="secondary" onClick={() => h.setVista('inventario')}>
                <MaterialIcon icon="inventory_2" className="w-4 h-4" />
                Consultar inventario
              </PageActionButton>
            </PageActionGroup>
          ) : undefined
        }
      />

      {h.mensaje.visible && (
        <div
          className={`mb-6 p-5 rounded-[1.5rem] border flex items-center justify-between shadow-sm ${
            h.mensaje.tipo === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">{h.mensaje.texto}</span>
          <button
            type="button"
            onClick={() => h.setMensaje((m) => ({ ...m, visible: false }))}
            className="p-1 opacity-60 hover:opacity-100"
            aria-label="Cerrar"
          >
            <MaterialIcon icon="close" className="w-4 h-4" />
          </button>
        </div>
      )}

      {h.error && (
        <div className="mb-6 p-5 rounded-[1.5rem] border border-red-100 bg-red-50 text-red-700 text-sm font-medium">
          {h.error}
        </div>
      )}

      <div key={h.vista} className="animate-googleSoftFadeIn">
        {h.vista === 'inventario' ? (
          <VistaInventarioPisos refreshKey={h.stockRefreshKey} onVolver={() => h.setVista('catalogo')} />
        ) : (
          <div className="app-panel rounded-[30px] border shadow-sm overflow-hidden mb-0">
            <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-100">
              <nav className="flex flex-wrap gap-2" aria-label="Catálogo">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => h.setTab(t.id)}
                    className={`inline-flex min-h-12 items-center gap-2.5 rounded-[30px] px-5 py-3 text-[11px] font-bold uppercase tracking-widest hover-scale-google transition-all duration-300 ease-[var(--ease-google-emphasized)] ${
                      h.tab === t.id
                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)] shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'
                    }`}
                  >
                    <MaterialIcon icon={t.icon} className="w-5 h-5" />
                    {t.label}
                  </button>
                ))}
              </nav>
              <label className="ml-auto inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-black transition-colors duration-200 select-none">
                <input
                  type="checkbox"
                  checked={h.incluirInactivos}
                  onChange={(e) => h.setIncluirInactivos(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 transition-all duration-200 checked:bg-[var(--app-accent)]"
                />
                Ver inactivos
              </label>
              <button
                type="button"
                onClick={onCrear}
                className="inline-flex min-h-12 items-center gap-2 px-5 py-3 bg-[var(--app-accent)] text-[var(--app-accent-fg)] rounded-[30px] text-[11px] font-bold uppercase tracking-widest hover:opacity-90 hover-scale-google transition-all duration-300 ease-[var(--ease-google-emphasized)] shadow-sm hover:shadow-md"
              >
                <MaterialIcon icon="add" className="w-5 h-5" />
                {tituloCrear}
              </button>
            </div>

            <div key={h.tab} className="animate-googleSoftFadeIn">
              {h.tab === 'pisos' && (
                <PisosLista
                  pisos={h.pisos}
                  cargando={h.cargando}
                  onCrear={() => h.setFormPisoSector({ tipo: 'piso', modo: 'crear', nombre: '' })}
                  onEditar={(p: Piso) =>
                    h.setFormPisoSector({
                      tipo: 'piso',
                      modo: 'editar',
                      id: p.idUbicacion,
                      nombre: p.nombre,
                    })
                  }
                  onDesactivar={h.setConfirmDesactivar}
                  onReactivar={(id) => h.reactivar('piso', id)}
                />
              )}
              {h.tab === 'sectores' && (
                <SectoresLista
                  sectores={h.sectores}
                  cargando={h.cargando}
                  onCrear={() => h.setFormPisoSector({ tipo: 'sector', modo: 'crear', nombre: '' })}
                  onEditar={(a: AreaCatalogo) =>
                    h.setFormPisoSector({
                      tipo: 'sector',
                      modo: 'editar',
                      id: a.idArea,
                      nombre: a.nombre,
                    })
                  }
                  onDesactivar={h.setConfirmDesactivar}
                  onReactivar={(id) => h.reactivar('sector', id)}
                />
              )}
              {h.tab === 'ubicaciones' && (
                <UbicacionesLista
                  grupos={h.ubicacionesGrupos}
                  cobertura={h.ubicacionesCobertura}
                  global={h.ubicacionesGlobal}
                  cargando={h.cargando}
                  onCrear={() => void h.abrirModalUbicacion()}
                  onDesactivar={h.setConfirmDesactivar}
                  onReactivar={(id) => h.reactivar('ubicacion', id)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <FormPisoSectorModal
        form={h.formPisoSector}
        guardando={h.guardando}
        onClose={() => h.setFormPisoSector(null)}
        onChange={h.setFormPisoSector}
        onGuardar={() => void h.guardarPisoSector()}
      />

      <FormUbicacionModal
        form={h.formUbicacion}
        pisos={h.selectPisos}
        sectores={h.selectSectores}
        faltantes={h.ubicacionesCobertura?.faltantes ?? []}
        combinacionesFaltantesTotal={h.ubicacionesCobertura?.combinacionesFaltantes ?? 0}
        guardando={h.guardando}
        onClose={() => h.setFormUbicacion(null)}
        onChange={h.setFormUbicacion}
        onGuardar={() => void h.guardarUbicacion()}
      />

      <ConfirmModal
        open={h.confirmDesactivar != null}
        title="Desactivar registro"
        message={confirmMessage}
        variant="warning"
        confirmText="Desactivar"
        cancelText="Cancelar"
        onConfirm={() => void h.ejecutarDesactivar()}
        onCancel={() => h.setConfirmDesactivar(null)}
      />
    </div>
  );
};

export default EstructuraAlmacenView;
