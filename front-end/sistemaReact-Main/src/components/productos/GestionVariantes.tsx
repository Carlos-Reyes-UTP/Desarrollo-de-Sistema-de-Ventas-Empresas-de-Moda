import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, Package, Palette, Ruler, ShoppingBag, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import type { Color } from '../../interfaces/Color';
import type { Talla } from '../../interfaces/Talla';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import { ColorService } from '../../services/ColorService';
import { TallaService } from '../../services/TallaService';
import { AlertModal, ConfirmModal } from '../common';

interface GestionVariantesProps {
  producto: Producto;
  onClose: () => void;
  onVariantesActualizadas: () => void;
}

const GestionVariantes: React.FC<GestionVariantesProps> = ({
  producto,
  onClose,
  onVariantesActualizadas
}) => {
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [colores, setColores] = useState<Color[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaVariante, setShowNuevaVariante] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario nueva variante
  const [formVariante, setFormVariante] = useState({
    tallaId: '',
    colorId: '',
    cantidad: '',
    codigoIdentificacion: ''
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [varianteAEliminar, setVarianteAEliminar] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });

  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    setIsModalVisible(true);
    cargarDatos();
  }, [producto.idProducto]);

  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300); // Esperar a que la animación termine
  }

  const cargarDatos = async () => {
    if (!producto.idProducto) return;
    try {
      setLoading(true);
      setError(null);
      const [variantesData, coloresData, tallasData] = await Promise.all([
        ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto),
        ColorService.getAllColores(),
        TallaService.getTallasOrdenadas()
      ]);
      const variantesUnicas = Array.from(new Map(variantesData.map(v => [v.idVariante, v])).values());
      const variantesOrdenadas = [...variantesUnicas].sort((a, b) => {
        const compareTalla = a.talla.nombreTalla.localeCompare(b.talla.nombreTalla);
        if (compareTalla !== 0) return compareTalla;
        return a.color.nombre.localeCompare(b.color.nombre);
      });
      setVariantes(variantesOrdenadas);
      setColores(coloresData);
      setTallas(tallasData);
    } catch (err: any) {
      setError('Error al cargar datos: ' + (err.message ?? 'Error de comunicación'));
    } finally {
      setLoading(false);
    }
  };

  const handleCrearVariante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.idProducto) return;
    try {
      const talla = tallas.find(t => t.idTalla?.toString() === formVariante.tallaId);
      const color = colores.find(c => c.idColor?.toString() === formVariante.colorId);
      if (!talla || !color) throw new Error('Talla y color son requeridos');
      const varianteExistente = variantes.find(v => v.talla.idTalla === talla.idTalla && v.color.idColor === color.idColor);
      if (varianteExistente) {
        setError(`Ya existe una variante con la talla "${talla.nombreTalla}" y color "${color.nombre}".`);
        return;
      }
      const cantidad = parseInt(formVariante.cantidad);
      if (isNaN(cantidad) || cantidad < 0) {
        setError('La cantidad debe ser un número entero no negativo');
        return;
      }
      const nuevaVariante: Omit<ProductoVariante, 'idVariante'> = {
        producto,
        talla,
        color,
        cantidad,
        codigoBarrasVariante: formVariante.codigoIdentificacion
      };
      const varianteCreada = await ProductoVarianteService.crearVariante(nuevaVariante);
      setVariantes(prev => [...prev, varianteCreada].sort((a, b) => {
        const cT = a.talla.nombreTalla.localeCompare(b.talla.nombreTalla);
        return cT !== 0 ? cT : a.color.nombre.localeCompare(b.color.nombre);
      }));
      setFormVariante({ tallaId: '', colorId: '', cantidad: '', codigoIdentificacion: '' });
      setShowNuevaVariante(false);
      setError(null);
      onVariantesActualizadas();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Error al crear variante');
    }
  };

  const handleActualizarCantidad = async (idVariante: number, nuevaCantidad: number) => {
    try {
      const varianteActualizada = await ProductoVarianteService.actualizarCantidad(idVariante, nuevaCantidad);
      setVariantes(prev => prev.map(v => v.idVariante === idVariante ? varianteActualizada : v));
      onVariantesActualizadas();
    } catch (err: any) {
      setError('Error al actualizar cantidad: ' + (err.message ?? 'Error de comunicación'));
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
      setError('Error al eliminar variante: ' + (err.message ?? 'Error de comunicación'));
    } finally {
      setVarianteAEliminar(null);
      setConfirmModalOpen(false);
    }
  };

  const cancelarEliminarVariante = () => {
    setVarianteAEliminar(null);
    setConfirmModalOpen(false);
  };

  const totalStock = variantes.reduce((sum, v) => sum + v.cantidad, 0);

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 ${isModalVisible ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative ${isModalVisible ? 'animate-scaleIn' : 'animate-scaleOut'}`}>

        {/* Header */}
        <div className="p-10 pb-6 border-b border-gray-100">
          <div className="mb-6 w-12 h-1 bg-black"></div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                Gestión de Variantes
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                {producto.nombre} — {producto.codigoIdentificacion}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4" />
                Stock: {totalStock}
              </span>
              <button 
                onClick={handleClose} 
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10">
          {error && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6" role="alert">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowNuevaVariante(true)}
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Nueva Variante
            </button>

            <button
              onClick={cargarDatos}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
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
                <tbody className="bg-white divide-y divide-gray-50">
                  {variantes.map((variante) => (
                    <VarianteRow
                      key={variante.idVariante}
                      variante={variante}
                      onActualizarCantidad={handleActualizarCantidad}
                      onEliminar={solicitarEliminarVariante}
                      ocultarColumnaVariante={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {variantes.length === 0 && !loading && (
              <div className="text-center p-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">Sin variantes registradas</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">Agrega variantes para gestionar el inventario por talla y color.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODALES --- */}
      {/* Modal Nueva Variante */}
      {showNuevaVariante && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden animate-scaleIn">
            <div className="p-10">
              <div className="mb-6 w-12 h-1 bg-black"></div>
              <h3 className="text-2xl font-bold tracking-tight text-black mb-2 uppercase">
                Nueva Variante
              </h3>
              <p className="text-gray-500 text-sm mb-10 font-medium">
                Agregue una nueva variante del producto
              </p>

              <form onSubmit={handleCrearVariante} className="space-y-6">
                {/* Selector de Talla */}
                <div className="space-y-2">
                  <label htmlFor="tallaSelect" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    <span className="flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Talla
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    id="tallaSelect"
                    value={formVariante.tallaId}
                    onChange={(e) => setFormVariante({ ...formVariante, tallaId: e.target.value })}
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    required
                  >
                    <option value="">Seleccionar talla</option>
                    {tallas.map(talla => (
                      <option key={talla.idTalla} value={talla.idTalla?.toString()}>
                        {talla.nombreTalla}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Color */}
                <div className="space-y-2">
                  <label htmlFor="colorSelect" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    <span className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <select
                    id="colorSelect"
                    value={formVariante.colorId}
                    onChange={(e) => setFormVariante({ ...formVariante, colorId: e.target.value })}
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    required
                  >
                    <option value="">Seleccionar color</option>
                    {colores.map(color => (
                      <option key={color.idColor} value={color.idColor?.toString()}>
                        {color.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <label htmlFor="cantidadInput" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
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
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                    required
                  />
                </div>

                {/* Código de Identificación (opcional) */}
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
                    className="w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>

                {/* Vista previa de la combinación */}
                {formVariante.tallaId && formVariante.colorId && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Vista previa:</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-black">
                        {tallas.find(t => t.idTalla?.toString() === formVariante.tallaId)?.nombreTalla}
                      </span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-lg border-2 border-gray-200"
                          style={{
                            backgroundColor: colores.find(c => c.idColor?.toString() === formVariante.colorId)?.codigoHex ?? '#FFFFFF'
                          }}
                        ></div>
                        <span className="text-sm font-bold text-black">
                          {colores.find(c => c.idColor?.toString() === formVariante.colorId)?.nombre}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNuevaVariante(false);
                      setFormVariante({ tallaId: '', colorId: '', cantidad: '', codigoIdentificacion: '' });
                      setError(null);
                    }}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-black hover:bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Variante
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmación para eliminar variantes */}
      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar esta variante? El stock se perderá."
        onConfirm={confirmarEliminarVariante}
        onCancel={cancelarEliminarVariante}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
      {/* Alert Modal for quantity validation */}
      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

const VarianteRow: React.FC<{
  variante: ProductoVariante;
  onActualizarCantidad: (id: number, cantidad: number) => void;
  onEliminar: (id: number) => void;
  ocultarColumnaVariante?: boolean;
}> = ({ variante, onActualizarCantidad, onEliminar, ocultarColumnaVariante }) => {
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(variante.cantidad.toString());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNuevaCantidad(variante.cantidad.toString());
  }, [variante.cantidad]);

  const handleGuardarCantidad = async () => {
    if (!variante.idVariante || guardando) return;
    const cantidadNumerica = parseInt(nuevaCantidad);
    if (isNaN(cantidadNumerica) || cantidadNumerica < 0) {
      setAlertModal({ open: true, message: 'Por favor ingresa una cantidad válida.', variant: 'warning' });
      setNuevaCantidad(variante.cantidad.toString());
      return;
    }
    if (cantidadNumerica === variante.cantidad) {
      setEditandoCantidad(false);
      return;
    }
    try {
      setGuardando(true);
      onActualizarCantidad(variante.idVariante, cantidadNumerica);
      setEditandoCantidad(false);
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      setNuevaCantidad(variante.cantidad.toString());
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoCantidad(false);
    setNuevaCantidad(variante.cantidad.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGuardarCantidad();
    else if (e.key === 'Escape') handleCancelarEdicion();
  };

  return (
    <tr className="hover:bg-gray-50/70 transition-colors duration-200 group">
      {/* Solo mostrar la columna Variante si no está oculta (por compatibilidad futura) */}
      {!ocultarColumnaVariante && (
        <td className="px-8 py-5 font-mono text-sm text-gray-700">{variante.codigoIdentificacion ?? 'N/A'}</td>
      )}
      <td className="px-8 py-5">
        <span className="font-bold text-sm text-black">{variante.talla.nombreTalla}</span>
      </td>
      <td className="px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border-2 border-gray-200" style={{ backgroundColor: variante.color.codigoHex ?? '#FFFFFF' }}></div>
          <span className="font-bold text-sm text-black">{variante.color.nombre}</span>
        </div>
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
              className="w-24 px-4 py-3 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 text-center transition-all"
              autoFocus
            />
          </div>
        ) : (
          (() => {
            let cantidadClass;
            if (variante.cantidad === 0) {
              cantidadClass = 'bg-red-100 text-red-700';
            } else if (variante.cantidad < 10) {
              cantidadClass = 'bg-orange-100 text-orange-700';
            } else {
              cantidadClass = 'bg-green-100 text-green-700';
            }
            return (
              <button
                onClick={() => setEditandoCantidad(true)}
                className={`inline-flex items-center justify-center gap-2 min-w-[80px] px-3 py-1.5 rounded-full font-bold cursor-pointer transition-transform duration-200 group-hover:scale-105 border-0 ${cantidadClass}`}
                title="Clic para editar cantidad"
              >
                <ShoppingBag className="w-4 h-4" />
                {variante.cantidad}
              </button>
            );
          })()
        )}
      </td>
      <td className="px-8 py-5 text-right">
        {editandoCantidad ? (
          <div className="flex items-center justify-end gap-2">
            <button onClick={handleGuardarCantidad} disabled={guardando} className="p-2.5 rounded-xl text-black bg-gray-100 hover:bg-black hover:text-white disabled:opacity-50 transition-all" title="Guardar"><Save className="w-4 h-4" /></button>
            <button onClick={handleCancelarEdicion} disabled={guardando} className="p-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-all" title="Cancelar"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setEditandoCantidad(true)} className="p-2.5 rounded-xl text-gray-400 hover:bg-black hover:text-white transition-all" title="Editar Cantidad"><Edit className="w-4 h-4" /></button>
            <button onClick={() => onEliminar(variante.idVariante!)} className="p-2.5 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Eliminar Variante"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default GestionVariantes;
