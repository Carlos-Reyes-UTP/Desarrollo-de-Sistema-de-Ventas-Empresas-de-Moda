import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, Package, Palette, Ruler, ShoppingBag, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import type { Color } from '../../interfaces/Color';
import type { Talla } from '../../interfaces/Talla';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import { ColorService } from '../../services/ColorService';
import { TallaService } from '../../services/TallaService';

interface GestionVariantesProps {
  producto: Producto;
  onClose: () => void;
  onVariantesActualizadas: () => void;
}

// Modal de confirmación reutilizable con diseño mejorado
const ConfirmModal: React.FC<{
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, message, onConfirm, onCancel }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 relative border border-gray-200 transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="text-center">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar eliminación</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors duration-200 w-full"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/50 w-full"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${isModalVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-gray-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 transform transition-all duration-300 ${isModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>

        {/* Header con diseño mejorado */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
          <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Gestión de Variantes</h2>
                <p className="text-indigo-100 text-sm">{producto.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-semibold border border-white/30">
                <Package className="w-4 h-4" />
                {producto.codigoIdentificacion}
              </span>
              {(() => {
                let stockClass;
                if (totalStock === 0) {
                  stockClass = 'bg-red-500/20 text-red-100 border-red-400/30';
                } else if (totalStock < 50) {
                  stockClass = 'bg-orange-500/20 text-orange-100 border-orange-400/30';
                } else {
                  stockClass = 'bg-green-500/20 text-green-100 border-green-400/30';
                }
                return (
                  <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-bold backdrop-blur-sm border ${stockClass}`}>
                    <ShoppingBag className="w-4 h-4" />
                    Stock Total: {totalStock}
                  </span>
                );
              })()}
              <button onClick={handleClose} className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={() => setShowNuevaVariante(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all duration-300 ease-in-out shadow-md hover:shadow-lg hover:shadow-blue-500/50 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Nueva Variante
              </button>

              <button
                onClick={cargarDatos}
                disabled={loading}
                className="bg-white hover:bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-colors duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100/70">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Talla</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Color</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
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
                <div className="text-center p-12">
                  <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Este producto no tiene variantes</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Agrega variantes para gestionar el inventario por talla y color.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALES --- */}
      {/* Modal Nueva Variante - Como modal independiente */}
      {showNuevaVariante && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl p-6">
              <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Nueva Variante</h3>
                    <p className="text-indigo-100 text-sm">Agregue una nueva variante del producto</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNuevaVariante(false);
                    setFormVariante({ tallaId: '', colorId: '', cantidad: '', codigoIdentificacion: '' });
                    setError(null);
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleCrearVariante} className="p-6 space-y-6">
                {/* Selector de Talla */}
                <div className="space-y-2">
                  <label htmlFor="tallaSelect" className="block text-sm font-semibold text-gray-700">
                    <span className="flex items-center">
                      <Ruler className="w-4 h-4 mr-2 text-indigo-500" />
                      Talla
                      <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <select
                    id="tallaSelect"
                    value={formVariante.tallaId}
                    onChange={(e) => setFormVariante({ ...formVariante, tallaId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
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
                  <label htmlFor="colorSelect" className="block text-sm font-semibold text-gray-700">
                    <span className="flex items-center">
                      <Palette className="w-4 h-4 mr-2 text-indigo-500" />
                      Color
                      <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <select
                    id="colorSelect"
                    value={formVariante.colorId}
                    onChange={(e) => setFormVariante({ ...formVariante, colorId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
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
                  <label htmlFor="cantidadInput" className="block text-sm font-semibold text-gray-700">
                    <span className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-indigo-500" />
                      Cantidad Inicial
                      <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <input
                    id="cantidadInput"
                    type="number"
                    value={formVariante.cantidad}
                    onChange={(e) => setFormVariante({ ...formVariante, cantidad: e.target.value })}
                    placeholder="Ej: 10"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                    required
                  />
                </div>

                {/* Código de Identificación (opcional) */}
                <div className="space-y-2">
                  <label htmlFor="codigoIdentificacion" className="block text-sm font-semibold text-gray-700">
                    Código de Barras (opcional)
                  </label>
                  <input
                    id="codigoIdentificacion"
                    type="text"
                    value={formVariante.codigoIdentificacion}
                    onChange={(e) => setFormVariante({ ...formVariante, codigoIdentificacion: e.target.value })}
                    placeholder="Ej: PROD001-M-AZUL"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 hover:border-indigo-400"
                  />
                </div>

                {/* Vista previa de la combinación */}
                {formVariante.tallaId && formVariante.colorId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-medium">Vista previa:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold">
                        {tallas.find(t => t.idTalla?.toString() === formVariante.tallaId)?.nombreTalla}
                      </span>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: colores.find(c => c.idColor?.toString() === formVariante.colorId)?.codigoHex ?? '#FFFFFF'
                          }}
                        ></div>
                        <span className="text-sm font-semibold">
                          {colores.find(c => c.idColor?.toString() === formVariante.colorId)?.nombre}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-8 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNuevaVariante(false);
                      setFormVariante({ tallaId: '', colorId: '', cantidad: '', codigoIdentificacion: '' });
                      setError(null);
                    }}
                    className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 border-2 border-transparent rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 inline-flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
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
      alert('Por favor ingresa una cantidad válida.');
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
        <td className="px-6 py-4 font-mono text-sm text-gray-700">{variante.codigoIdentificacion ?? 'N/A'}</td>
      )}
      <td className="px-6 py-4 font-semibold text-gray-800">{variante.talla.nombreTalla}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: variante.color.codigoHex ?? '#FFFFFF' }}></div>
          <span className="font-medium text-gray-800">{variante.color.nombre}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {editandoCantidad ? (
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              disabled={guardando}
              className="w-24 px-3 py-2 border-2 border-indigo-300 rounded-xl bg-indigo-50 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-sm text-center transition-all duration-200"
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
      <td className="px-6 py-4 text-right">
        {editandoCantidad ? (
          <div className="flex items-center justify-end gap-2">
            <button onClick={handleGuardarCantidad} disabled={guardando} className="p-2 rounded-full text-green-600 bg-green-100 hover:bg-green-200 disabled:opacity-50" title="Guardar"><Save className="w-5 h-5" /></button>
            <button onClick={handleCancelarEdicion} disabled={guardando} className="p-2 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50" title="Cancelar"><X className="w-5 h-5" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setEditandoCantidad(true)} className="p-2 rounded-full text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors" title="Editar Cantidad"><Edit className="w-5 h-5" /></button>
            <button onClick={() => onEliminar(variante.idVariante!)} className="p-2 rounded-full text-red-600 bg-red-100 hover:bg-red-200 transition-colors" title="Eliminar Variante"><Trash2 className="w-5 h-5" /></button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default GestionVariantes;
