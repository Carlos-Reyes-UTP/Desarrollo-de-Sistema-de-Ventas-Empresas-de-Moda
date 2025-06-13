import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, Package } from 'lucide-react';
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
  const [showMigracion, setShowMigracion] = useState(false);
  const [editandoVariante, setEditandoVariante] = useState<ProductoVariante | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario nueva variante
  const [formVariante, setFormVariante] = useState({
    tallaId: '',
    colorId: '',
    cantidad: '',
    codigoIdentificacion: ''
  });

  // Formulario migración
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<number[]>([]);
  const [coloresSeleccionados, setColoresSeleccionados] = useState<number[]>([]);
  const [distribucionPorcentual, setDistribucionPorcentual] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [producto.idProducto]);

  const cargarDatos = async () => {
    if (!producto.idProducto) return;

    try {
      setLoading(true);
      const [variantesData, coloresData, tallasData] = await Promise.all([
        ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto),
        ColorService.getAllColores(),
        TallaService.getTallasOrdenadas()
      ]);

      setVariantes(variantesData);
      setColores(coloresData);
      setTallas(tallasData);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
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

      if (!talla || !color) {
        throw new Error('Talla y color son requeridos');
      }

      const nuevaVariante: Omit<ProductoVariante, 'idVariante'> = {
        producto,
        talla,
        color,
        cantidad: parseInt(formVariante.cantidad),
        codigoIdentificacion: formVariante.codigoIdentificacion
      };

      await ProductoVarianteService.crearVariante(nuevaVariante);
      await cargarDatos();
      setShowNuevaVariante(false);
      setFormVariante({ tallaId: '', colorId: '', cantidad: '', codigoIdentificacion: '' });
      onVariantesActualizadas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear variante');
    }
  };

  const handleActualizarCantidad = async (idVariante: number, nuevaCantidad: number) => {
    try {
      await ProductoVarianteService.actualizarCantidad(idVariante, nuevaCantidad);
      await cargarDatos();
      onVariantesActualizadas();
    } catch (err) {
      setError('Error al actualizar cantidad');
    }
  };

  const handleEliminarVariante = async (idVariante: number) => {
    if (!confirm('¿Estás seguro de eliminar esta variante?')) return;

    try {
      await ProductoVarianteService.eliminarVariante(idVariante);
      await cargarDatos();
      onVariantesActualizadas();
    } catch (err) {
      setError('Error al eliminar variante');
    }
  };

  const handleMigrarProducto = async () => {
    if (!producto.idProducto || tallasSeleccionadas.length === 0 || coloresSeleccionados.length === 0) {
      setError('Selecciona al menos una talla y un color');
      return;
    }

    try {
      const tallasObj = tallas.filter(t => t.idTalla && tallasSeleccionadas.includes(t.idTalla));
      const coloresObj = colores.filter(c => c.idColor && coloresSeleccionados.includes(c.idColor));

      await ProductoVarianteService.migrarProductoAVariantes(
        producto.idProducto,
        tallasObj,
        coloresObj,
        distribucionPorcentual
      );

      await cargarDatos();
      setShowMigracion(false);
      setTallasSeleccionadas([]);
      setColoresSeleccionados([]);
      onVariantesActualizadas();
    } catch (err) {
      setError('Error al migrar producto');
    }
  };

  const totalStock = variantes.reduce((sum, v) => sum + v.cantidad, 0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Variantes - {producto.nombre}
            </h2>
            <p className="text-sm text-gray-600">
              Código: {producto.codigoIdentificacion} | Stock Total: {totalStock}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="p-6">
          {/* Botones de acción */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowNuevaVariante(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Variante
            </button>
            
            {variantes.length === 0 && (
              <button
                onClick={() => setShowMigracion(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Migrar a Variantes
              </button>
            )}
          </div>

          {/* Tabla de variantes */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talla</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variantes.map((variante) => (
                  <VarianteRow
                    key={variante.idVariante}
                    variante={variante}
                    onActualizarCantidad={handleActualizarCantidad}
                    onEliminar={handleEliminarVariante}
                  />
                ))}
              </tbody>
            </table>
            
            {variantes.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay variantes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Agrega variantes para gestionar el inventario por talla y color.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Nueva Variante */}
        {showNuevaVariante && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Nueva Variante</h3>
              <form onSubmit={handleCrearVariante} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Identificación
                  </label>
                  <input
                    type="text"
                    value={formVariante.codigoIdentificacion}
                    onChange={(e) => setFormVariante(prev => ({ ...prev, codigoIdentificacion: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talla</label>
                    <select
                      value={formVariante.tallaId}
                      onChange={(e) => setFormVariante(prev => ({ ...prev, tallaId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {tallas.map(talla => (
                        <option key={talla.idTalla} value={talla.idTalla}>
                          {talla.nombreTalla}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <select
                      value={formVariante.colorId}
                      onChange={(e) => setFormVariante(prev => ({ ...prev, colorId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {colores.map(color => (
                        <option key={color.idColor} value={color.idColor}>
                          {color.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={formVariante.cantidad}
                    onChange={(e) => setFormVariante(prev => ({ ...prev, cantidad: e.target.value }))}
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNuevaVariante(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Migración */}
        {showMigracion && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Migrar Producto a Sistema de Variantes</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tallas disponibles:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {tallas.map(talla => (
                      <label key={talla.idTalla} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={talla.idTalla ? tallasSeleccionadas.includes(talla.idTalla) : false}
                          onChange={(e) => {
                            if (!talla.idTalla) return;
                            if (e.target.checked) {
                              setTallasSeleccionadas(prev => [...prev, talla.idTalla!]);
                            } else {
                              setTallasSeleccionadas(prev => prev.filter(id => id !== talla.idTalla));
                            }
                          }}
                          className="mr-2"
                        />
                        {talla.nombreTalla}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Colores disponibles:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {colores.map(color => (
                      <label key={color.idColor} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={color.idColor ? coloresSeleccionados.includes(color.idColor) : false}
                          onChange={(e) => {
                            if (!color.idColor) return;
                            if (e.target.checked) {
                              setColoresSeleccionados(prev => [...prev, color.idColor!]);
                            } else {
                              setColoresSeleccionados(prev => prev.filter(id => id !== color.idColor));
                            }
                          }}
                          className="mr-2"
                        />
                        {color.nombre}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={distribucionPorcentual}
                      onChange={(e) => setDistribucionPorcentual(e.target.checked)}
                      className="mr-2"
                    />
                    Distribución porcentual automática
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowMigracion(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleMigrarProducto}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    Migrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para cada fila de variante
const VarianteRow: React.FC<{
  variante: ProductoVariante;
  onActualizarCantidad: (id: number, cantidad: number) => void;
  onEliminar: (id: number) => void;
}> = ({ variante, onActualizarCantidad, onEliminar }) => {
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(variante.cantidad.toString());

  const handleGuardarCantidad = () => {
    if (variante.idVariante) {
      onActualizarCantidad(variante.idVariante, parseInt(nuevaCantidad));
      setEditandoCantidad(false);
    }
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {variante.codigoIdentificacion}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {variante.talla.nombreTalla}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          {variante.color.codigoHex && (
            <div
              className="w-4 h-4 rounded-full border mr-2"
              style={{ backgroundColor: variante.color.codigoHex }}
            />
          )}
          {variante.color.nombre}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {editandoCantidad ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              min="0"
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleGuardarCantidad}
              className="text-green-600 hover:text-green-800"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditandoCantidad(false);
                setNuevaCantidad(variante.cantidad.toString());
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${
              variante.cantidad === 0 ? 'text-red-600' : 
              variante.cantidad < 10 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {variante.cantidad}
            </span>
            <button
              onClick={() => setEditandoCantidad(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => variante.idVariante && onEliminar(variante.idVariante)}
          className="text-red-600 hover:text-red-900"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default GestionVariantes;
