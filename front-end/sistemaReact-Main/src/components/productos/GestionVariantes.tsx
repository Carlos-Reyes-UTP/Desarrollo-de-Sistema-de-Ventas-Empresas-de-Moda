import React, { useState, useEffect, useMemo } from 'react';
import type { Producto } from '../../types/Producto';
import type { ProductoVariante } from '../../types/ProductoVariante';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import {
  tallaDesdeNombre,
  colorDesdeNombre,
  mismoParTallaColor,
  nombresUnicosOrdenados,
} from '../../utils/varianteCatalogoHelpers';
import { AlertModal, ConfirmModal, Skeleton, MaterialIcon, ModalPortal, useModalBodyScrollLock, useModalMotion } from '@/shared/ui';

interface GestionVariantesProps {
  producto: Producto;
  onClose: () => void;
  onVariantesActualizadas: () => void;
}

const DL_TALLAS = 'gestion-variantes-tallas-dl';
const DL_COLORES = 'gestion-variantes-colores-dl';

const GestionVariantes: React.FC<GestionVariantesProps> = ({
  producto,
  onClose,
  onVariantesActualizadas
}) => {
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [sugerenciasTallas, setSugerenciasTallas] = useState<string[]>([]);
  const [sugerenciasColores, setSugerenciasColores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaVariante, setShowNuevaVariante] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formVariante, setFormVariante] = useState({
    nombreTalla: '',
    nombreColor: '',
    cantidad: '',
    codigoIdentificacion: ''
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [varianteAEliminar, setVarianteAEliminar] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' | 'warning' }>({ open: false, message: '', variant: 'info' });

  const { overlayClass, panelClass, requestClose } = useModalMotion({ open: true });
  const { overlayClass: nuevaOverlayClass, panelClass: nuevaPanelClass, shouldRender: shouldRenderNuevaVariante, requestClose: requestCloseNuevaVariante } = useModalMotion({ open: showNuevaVariante });

  useModalBodyScrollLock(true);

  useEffect(() => {
    cargarDatos();
  }, [producto.idProducto]);

  const handleClose = () => {
    requestClose(onClose);
  };

  const cargarDatos = async () => {
    if (!producto.idProducto) return;
    try {
      setLoading(true);
      setError(null);
      const variantesData = await ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto);
      const variantesUnicas = Array.from(new Map(variantesData.map(v => [v.idVariante, v])).values());
      const variantesOrdenadas = variantesUnicas.toSorted((a, b) => {
        const compareTalla = (a.talla?.nombreTalla ?? '').localeCompare(b.talla?.nombreTalla ?? '');
        if (compareTalla !== 0) return compareTalla;
        return (a.color?.nombre ?? '').localeCompare(b.color?.nombre ?? '');
      });
      setVariantes(variantesOrdenadas);

      const sugerencias = await ProductoVarianteService.obtenerSugerenciasCatalogo();
      setSugerenciasTallas(sugerencias.tallas);
      setSugerenciasColores(sugerencias.colores);
    } catch (err: any) {
      setError('Error al cargar datos: ' + (err instanceof Error ? err.message : 'Error de comunicación'));
    } finally {
      setLoading(false);
    }
  };

  const hexPreviewNuevoColor = useMemo(() => {
    const n = formVariante.nombreColor.trim().toLowerCase();
    if (!n) return '#FFFFFF';
    const v = variantes.find(x => x.color.nombre.trim().toLowerCase() === n);
    return v?.color.codigoHex ?? '#CCCCCC';
  }, [variantes, formVariante.nombreColor]);

  const handleCrearVariante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.idProducto) return;
    try {
      const nombreTalla = formVariante.nombreTalla.trim();
      const nombreColor = formVariante.nombreColor.trim();
      if (!nombreTalla || !nombreColor) throw new Error('Talla y color son requeridos');

      const varianteExistente = variantes.find((v) =>
        mismoParTallaColor(
          { nombreTalla: v.talla.nombreTalla, nombreColor: v.color.nombre },
          { nombreTalla, nombreColor }
        )
      );
      if (varianteExistente) {
        setError(`Ya existe una variante con la talla "${nombreTalla}" y color "${nombreColor}".`);
        return;
      }
      const cantidad = parseInt(formVariante.cantidad, 10);
      if (isNaN(cantidad) || cantidad < 0) {
        setError('La cantidad debe ser un número entero no negativo');
        return;
      }

      const talla = tallaDesdeNombre(nombreTalla);
      const color = colorDesdeNombre(nombreColor);

      const nuevaVariante: Omit<ProductoVariante, 'idVariante'> = {
        producto,
        talla,
        color,
        cantidad,
        codigoBarrasVariante: formVariante.codigoIdentificacion
      };
      const varianteCreada = await ProductoVarianteService.crearVariante(nuevaVariante);
      setVariantes(prev => [...prev, varianteCreada].toSorted((a, b) => {
        const cT = a.talla.nombreTalla.localeCompare(b.talla.nombreTalla);
        return cT !== 0 ? cT : a.color.nombre.localeCompare(b.color.nombre);
      }));
      setFormVariante({ nombreTalla: '', nombreColor: '', cantidad: '', codigoIdentificacion: '' });
      requestCloseNuevaVariante(() => setShowNuevaVariante(false));
      setError(null);
      setSugerenciasTallas((p) => nombresUnicosOrdenados([...p, nombreTalla]));
      setSugerenciasColores((p) => nombresUnicosOrdenados([...p, nombreColor]));
      onVariantesActualizadas();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Error al crear variante');
    }
  };

  const handleActualizarCantidad = async (idVariante: number, nuevaCantidad: number) => {
    try {
      const varianteActualizada = await ProductoVarianteService.actualizarCantidad(idVariante, nuevaCantidad);
      setVariantes(prev => prev.map(v =>
        v.idVariante === idVariante
          ? { ...v, stockAlmacen: varianteActualizada.stockAlmacen ?? nuevaCantidad, cantidad: varianteActualizada.cantidad }
          : v
      ));
      onVariantesActualizadas();
    } catch (err: any) {
      setError('Error al actualizar cantidad: ' + (err instanceof Error ? err.message : 'Error de comunicación'));
      throw err;
    }
  };

  const solicitarEliminarVariante = (idVariante: number) => {
    setVarianteAEliminar(idVariante);
    setConfirmModalOpen(true);
  };

  const confirmarEliminarVariante = async () => {
    if (varianteAEliminar == null) return;
    try {
      await ProductoVarianteService.eliminarVariante(varianteAEliminar);
      setVariantes(prev => prev.filter(v => v.idVariante !== varianteAEliminar));
      onVariantesActualizadas();
    } catch (err: any) {
      setError('Error al eliminar variante: ' + (err instanceof Error ? err.message : 'Error de comunicación'));
    } finally {
      setVarianteAEliminar(null);
      setConfirmModalOpen(false);
    }
  };

  const cancelarEliminarVariante = () => {
    setVarianteAEliminar(null);
    setConfirmModalOpen(false);
  };

  const totalStock = variantes.reduce((sum, v) => sum + (v.stockAlmacen ?? v.cantidad), 0);

  return (
    <ModalPortal>
    <div className={`app-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 ${overlayClass}`}>
      <div className={`bg-app-surface rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative ${panelClass}`}>

        <div className="p-10 pb-6 border-b border-app-border">
          <div className="mb-6 w-12 h-1 bg-app-accent"></div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-app-text mb-2 uppercase">
                Gestión de Variantes
              </h2>
              <p className="text-app-text-muted text-sm font-medium">
                {producto.nombre} — {producto.codigoIdentificacion}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold uppercase tracking-wider">
                <MaterialIcon icon="shopping_bag" className="w-4 h-4" />
                Stock: {totalStock}
              </span>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <MaterialIcon icon="close" className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10">
          {error && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6" role="alert">
              <MaterialIcon icon="warning" className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowNuevaVariante(true)}
              className="bg-app-accent hover:opacity-90 text-app-accent-fg px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
            >
              <MaterialIcon icon="add" className="w-4 h-4" />
              Nueva Variante
            </button>

            <button
              onClick={cargarDatos}
              disabled={loading}
              className="bg-app-input hover:bg-app-hover-overlay text-app-text px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MaterialIcon icon="sync" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          <div className="bg-app-surface rounded-[2rem] border border-app-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Talla</th>
                    <th className="px-8 py-5 text-left text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Color</th>
                    <th className="px-8 py-5 text-center text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Cantidad</th>
                    <th className="px-8 py-5 text-right text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-app-surface divide-y divide-app-border">
                  {loading ? (
                    Array.from({ length: 6 }, (_, row) => (
                      <tr key={`sk-var-${row}`}>
                        <td className="px-8 py-5"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-8 py-5"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-8 py-5 text-center"><Skeleton className="mx-auto h-4 w-12" /></td>
                        <td className="px-8 py-5 text-right"><Skeleton className="ml-auto h-8 w-20 rounded-xl" /></td>
                      </tr>
                    ))
                  ) : variantes.map((variante) => (
                    <VarianteRow
                      key={variante.idVariante}
                      variante={variante}
                      onActualizarCantidad={handleActualizarCantidad}
                      onEliminar={solicitarEliminarVariante}
                      onAlert={(msg) => setAlertModal({ open: true, message: msg, variant: 'warning' })}
                      ocultarColumnaVariante={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {variantes.length === 0 && !loading && (
              <div className="text-center p-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <MaterialIcon icon="package" className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">Sin variantes registradas</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">Agrega variantes para gestionar el inventario por talla y color.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {shouldRenderNuevaVariante && (
        <div className={`app-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 ${nuevaOverlayClass}`} style={{ zIndex: 'calc(var(--app-z-modal) + 10)' }}>
          <div className={`bg-app-surface rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden ${nuevaPanelClass}`}>
            <div className="p-10">
              <div className="mb-6 w-12 h-1 bg-app-accent"></div>
              <h3 className="text-2xl font-bold tracking-tight text-app-text mb-2 uppercase">
                Nueva Variante
              </h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">
                Escribe o elige talla y color (sugerencias desde el inventario existente).
              </p>

              <form onSubmit={handleCrearVariante} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    <span className="flex items-center gap-2">
                      <MaterialIcon icon="straighten" className="w-4 h-4" />
                      Talla <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    list={DL_TALLAS}
                    value={formVariante.nombreTalla}
                    onChange={(e) => setFormVariante({ ...formVariante, nombreTalla: e.target.value })}
                    placeholder="Ej: M, L, 32"
                    className="w-full px-5 py-4 bg-app-input border-app-border rounded-xl text-sm font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all text-app-text"
                    autoComplete="off"
                  />
                  <datalist id={DL_TALLAS}>
                    {sugerenciasTallas.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                    <span className="flex items-center gap-2">
                      <MaterialIcon icon="palette" className="w-4 h-4" />
                      Color <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    list={DL_COLORES}
                    value={formVariante.nombreColor}
                    onChange={(e) => setFormVariante({ ...formVariante, nombreColor: e.target.value })}
                    placeholder="Ej: Azul marino"
                    className="w-full px-5 py-4 bg-app-input border-app-border rounded-xl text-sm font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all text-app-text"
                    autoComplete="off"
                  />
                  <datalist id={DL_COLORES}>
                    {sugerenciasColores.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label htmlFor="cantidadInput" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    <span className="flex items-center gap-2">
                      <MaterialIcon icon="package" className="w-4 h-4" />
                      Cantidad Inicial
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    id="cantidadInput"
                    type="number"
                    value={formVariante.cantidad}
                    onChange={(e) => setFormVariante({ ...formVariante, cantidad: e.target.value })}
                    placeholder="Ej: 10"
                    min="0"
                    className="w-full px-5 py-4 bg-app-input border-app-border rounded-xl text-sm font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all text-app-text"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="codigoIdentificacion" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    Código de Barras (opcional)
                  </label>
                  <input
                    id="codigoIdentificacion"
                    type="text"
                    value={formVariante.codigoIdentificacion}
                    onChange={(e) => setFormVariante({ ...formVariante, codigoIdentificacion: e.target.value })}
                    placeholder="Ej: PROD001-M-AZUL"
                    className="w-full px-5 py-4 bg-app-input border-app-border rounded-xl text-sm font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring transition-all text-app-text"
                  />
                </div>

                {formVariante.nombreTalla.trim() && formVariante.nombreColor.trim() && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Vista previa:</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-black">{formVariante.nombreTalla.trim()}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-lg border-2 border-gray-200"
                          style={{ backgroundColor: hexPreviewNuevoColor }}
                        />
                        <span className="text-sm font-bold text-black">{formVariante.nombreColor.trim()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      requestCloseNuevaVariante(() => setShowNuevaVariante(false));
                      setFormVariante({ nombreTalla: '', nombreColor: '', cantidad: '', codigoIdentificacion: '' });
                      setError(null);
                    }}
                    className="flex-1 py-4 bg-app-input hover:bg-app-hover-overlay text-app-text rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-app-accent hover:opacity-90 text-app-accent-fg rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="add" className="w-4 h-4" />
                    Crear Variante
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar esta variante? El stock se perderá."
        onConfirm={confirmarEliminarVariante}
        onCancel={cancelarEliminarVariante}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant === 'warning' ? 'info' : alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
    </ModalPortal>
  );
};

const VarianteRow: React.FC<{
  variante: ProductoVariante;
  onActualizarCantidad: (id: number, cantidad: number) => void;
  onEliminar: (id: number) => void;
  onAlert: (msg: string) => void;
  ocultarColumnaVariante?: boolean;
}> = ({ variante, onActualizarCantidad, onEliminar, onAlert, ocultarColumnaVariante }) => {
  const stockAlmacen = variante.stockAlmacen ?? variante.cantidad;
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(() => stockAlmacen.toString());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNuevaCantidad((variante.stockAlmacen ?? variante.cantidad).toString());
  }, [variante.stockAlmacen, variante.cantidad]);

  const handleGuardarCantidad = async () => {
    if (!variante.idVariante || guardando) return;
    const cantidadNumerica = parseInt(nuevaCantidad, 10);
    if (isNaN(cantidadNumerica) || cantidadNumerica < 0) {
      onAlert('Por favor ingresa una cantidad válida.');
      setNuevaCantidad((variante.stockAlmacen ?? variante.cantidad).toString());
      return;
    }
    if (cantidadNumerica === stockAlmacen) {
      setEditandoCantidad(false);
      return;
    }
    try {
      setGuardando(true);
      await onActualizarCantidad(variante.idVariante, cantidadNumerica);
      setEditandoCantidad(false);
    } catch {
      setNuevaCantidad((variante.stockAlmacen ?? variante.cantidad).toString());
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoCantidad(false);
    setNuevaCantidad(variante.cantidad.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleGuardarCantidad();
    else if (e.key === 'Escape') handleCancelarEdicion();
  };

  return (
    <tr className="hover:bg-gray-50/70 transition-colors duration-200 group">
      {!ocultarColumnaVariante && (
        <td className="px-8 py-5 font-mono text-sm text-gray-700">{variante.codigoIdentificacion ?? 'N/A'}</td>
      )}
      <td className="px-8 py-5">
        <span className="font-bold text-sm text-app-text">{variante.talla.nombreTalla}</span>
      </td>
      <td className="px-8 py-5">
        <span className="font-bold text-sm text-app-text">{variante.color.nombre}</span>
      </td>
      <td className="px-8 py-5 text-center">
        {editandoCantidad ? (
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              disabled={guardando}
              className="w-24 px-4 py-3 bg-app-input border-app-border rounded-xl text-sm font-bold focus:bg-app-surface focus:ring-2 focus:ring-app-ring text-center transition-all text-app-text"
              autoFocus
            />
          </div>
        ) : (
          (() => {
            const stockAlmacen = variante.stockAlmacen ?? variante.cantidad;
            let cantidadClass;
            if (stockAlmacen === 0) {
              cantidadClass = 'bg-red-100 text-red-700';
            } else if (stockAlmacen < 10) {
              cantidadClass = 'bg-orange-100 text-orange-700';
            } else {
              cantidadClass = 'bg-green-100 text-green-700';
            }
            return (
              <button
                type="button"
                onClick={() => setEditandoCantidad(true)}
                className={`inline-flex items-center justify-center gap-2 min-w-[80px] px-3 py-1.5 rounded-full font-bold cursor-pointer transition-transform duration-200 group-hover:scale-105 border-0 ${cantidadClass}`}
                title="Clic para editar cantidad"
              >
                <MaterialIcon icon="shopping_bag" className="w-4 h-4" />
                {stockAlmacen}
              </button>
            );
          })()
        )}
      </td>
      <td className="px-8 py-5 text-right">
        {editandoCantidad ? (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => void handleGuardarCantidad()} disabled={guardando} className="p-2.5 rounded-xl text-app-text bg-app-input hover:bg-app-accent hover:text-app-accent-fg disabled:opacity-50 transition-all" title="Guardar"><MaterialIcon icon="save" className="w-4 h-4" /></button>
            <button type="button" onClick={handleCancelarEdicion} disabled={guardando} className="p-2.5 rounded-xl text-app-text-muted bg-app-input hover:bg-app-hover-overlay disabled:opacity-50 transition-all" title="Cancelar"><MaterialIcon icon="close" className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setEditandoCantidad(true)} className="p-2.5 rounded-xl text-app-text-muted hover:bg-app-accent hover:text-app-accent-fg transition-all" title="Editar Cantidad"><MaterialIcon icon="edit" className="w-4 h-4" /></button>
            <button type="button" onClick={() => variante.idVariante && onEliminar(variante.idVariante)} className="p-2.5 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Eliminar Variante"><MaterialIcon icon="delete" className="w-4 h-4" /></button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default GestionVariantes;
