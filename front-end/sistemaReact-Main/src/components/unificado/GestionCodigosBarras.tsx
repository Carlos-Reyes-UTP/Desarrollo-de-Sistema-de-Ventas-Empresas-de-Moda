import React, { useState, useEffect } from 'react';
import { Search, Trash2, BarChart3, Scan, X, AlertCircle, CheckCircle } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { ProductoVariante } from '../../interfaces/ProductoVariante';
import type { CodigoBarras, GenerarCodigoRequest, AsignarCodigoRequest } from '../../interfaces/CodigoBarras';
import { CodigoBarrasService } from '../../services/CodigoBarrasService';
import { ProductoService } from '../../services/ProductoServices';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';

interface GestionCodigosBarrasProps {
  producto?: Producto;
  onClose?: () => void;
}

const GestionCodigosBarras: React.FC<GestionCodigosBarrasProps> = ({ 
  producto, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Estados principales
  const [productos, setProductos] = useState<Producto[]>([]);
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [codigosBarras, setCodigosBarras] = useState<CodigoBarras[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modales
  const [showGenerarCodigo, setShowGenerarCodigo] = useState(false);
  const [showAsignarCodigo, setShowAsignarCodigo] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<{
    id: number;
    tipo: 'PRODUCTO' | 'VARIANTE';
    nombre: string;
  } | null>(null);

  // Estados para formularios
  const [formGenerar, setFormGenerar] = useState({
    formato: 'EAN8' as 'EAN8' | 'EAN13' | 'CODE128'
  });

  const [formAsignar, setFormAsignar] = useState({
    codigo: '',
    formato: 'EAN8' as 'EAN8' | 'EAN13' | 'CODE128'
  });

  const [scannerInput, setScannerInput] = useState('');

  useEffect(() => {
    if (producto) {
      // Modo individual: gestionar códigos de un producto específico
      cargarDatosProducto();
    } else {
      // Modo general: gestionar códigos de todos los productos
      cargarTodosLosDatos();
    }
  }, [producto]);

  const cargarDatosProducto = async () => {
    if (!producto?.idProducto) return;

    try {
      setLoading(true);
      const [codigosData, variantesData] = await Promise.all([
        CodigoBarrasService.obtenerCodigosProducto(producto.idProducto),
        ProductoVarianteService.obtenerVariantesPorProducto(producto.idProducto)
      ]);

      // Obtener códigos de todas las variantes
      const codigosVariantes = await Promise.all(
        variantesData.map(async (variante) => {
          if (variante.idVariante) {
            return await CodigoBarrasService.obtenerCodigosVariante(variante.idVariante);
          }
          return [];
        })
      );

      const todosLosCodigos = [
        ...codigosData,
        ...codigosVariantes.flat()
      ];

      setCodigosBarras(todosLosCodigos);
      setVariantes(variantesData);
      setProductos([producto]);
    } catch (err) {
      setError('Error al cargar códigos de barras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosLosDatos = async () => {
    try {
      setLoading(true);
      const productosData = await ProductoService.getAllProductos('ROLE_ADMIN');
      setProductos(productosData);

      // Cargar códigos de todos los productos
      const todosLosCodigos: CodigoBarras[] = [];
      for (const prod of productosData) {
        if (prod.idProducto) {
          const codigosProducto = await CodigoBarrasService.obtenerCodigosProducto(prod.idProducto);
          todosLosCodigos.push(...codigosProducto);

          // Cargar códigos de variantes
          const variantes = await ProductoVarianteService.obtenerVariantesPorProducto(prod.idProducto);
          for (const variante of variantes) {
            if (variante.idVariante) {
              const codigosVariante = await CodigoBarrasService.obtenerCodigosVariante(variante.idVariante);
              todosLosCodigos.push(...codigosVariante);
            }
          }
        }
      }

      setCodigosBarras(todosLosCodigos);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarCodigo = async () => {
    if (!entidadSeleccionada) return;

    try {
      setLoading(true);
      setError(null);

      const request: GenerarCodigoRequest = {
        tipo: entidadSeleccionada.tipo,
        entidadId: entidadSeleccionada.id,
        formato: formGenerar.formato
      };

      const nuevoCodigo = await CodigoBarrasService.generarCodigo(request);
      setCodigosBarras(prev => [...prev, nuevoCodigo]);
      setShowGenerarCodigo(false);
      setEntidadSeleccionada(null);
      setExito(`Código ${nuevoCodigo.codigo} generado exitosamente`);
      
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar código');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarCodigo = async () => {
    if (!entidadSeleccionada || !formAsignar.codigo.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Validar formato
      if (!CodigoBarrasService.validarFormato(formAsignar.codigo, formAsignar.formato)) {
        throw new Error(`Código inválido para formato ${formAsignar.formato}`);
      }

      // Validar EAN-8 específicamente
      if (formAsignar.formato === 'EAN8' && !CodigoBarrasService.verificarEAN8(formAsignar.codigo)) {
        throw new Error('Código EAN-8 inválido (checksum incorrecto)');
      }

      const request: AsignarCodigoRequest = {
        codigo: formAsignar.codigo,
        tipo: entidadSeleccionada.tipo,
        entidadId: entidadSeleccionada.id,
        formato: formAsignar.formato
      };

      const nuevoCodigo = await CodigoBarrasService.asignarCodigo(request);
      setCodigosBarras(prev => [...prev, nuevoCodigo]);
      setShowAsignarCodigo(false);
      setEntidadSeleccionada(null);
      setFormAsignar({ codigo: '', formato: 'EAN8' });
      setExito(`Código ${nuevoCodigo.codigo} asignado exitosamente`);
      
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar código');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCodigo = async (codigoId: number) => {
    if (!confirm('¿Estás seguro de eliminar este código de barras?')) return;

    try {
      await CodigoBarrasService.eliminarCodigo(codigoId);
      setCodigosBarras(prev => prev.filter(c => c.id !== codigoId));
      setExito('Código eliminado exitosamente');
      setTimeout(() => setExito(null), 3000);
    } catch (err) {
      setError('Error al eliminar código');
    }
  };

  const handleBuscarPorCodigo = async () => {
    if (!scannerInput.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const resultado = await CodigoBarrasService.buscarPorCodigo(scannerInput);
      
      // Mostrar resultado
      const mensaje = `Encontrado: ${resultado.tipo} - ${
        resultado.tipo === 'PRODUCTO' 
          ? resultado.entidad.nombre 
          : `${resultado.entidad.producto.nombre} (${resultado.entidad.talla.nombre} - ${resultado.entidad.color.nombre})`
      }`;
      
      setExito(mensaje);
      setTimeout(() => setExito(null), 5000);
      
      setScannerInput('');
      setShowScannerModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const generarEAN8Ejemplo = () => {
    const codigo = CodigoBarrasService.generarEAN8();
    setFormAsignar(prev => ({ ...prev, codigo }));
  };

  const codigosFiltrados = codigosBarras.filter(codigo => {
    const termino = searchTerm.toLowerCase();
    return codigo.codigo.toLowerCase().includes(termino) ||
           codigo.formato.toLowerCase().includes(termino) ||
           codigo.tipo.toLowerCase().includes(termino);
  });

  // Función para obtener el nombre de la entidad
  const obtenerNombreEntidad = (codigo: CodigoBarras) => {
    if (codigo.tipo === 'PRODUCTO') {
      const prod = productos.find(p => p.idProducto === codigo.entidadId);
      return prod?.nombre || 'Producto no encontrado';
    } else {
      const variante = variantes.find(v => v.idVariante === codigo.entidadId);
      if (variante) {
        return `${variante.producto.nombre} (${variante.talla.nombreTalla} - ${variante.color.nombre})`;
      }
      return 'Variante no encontrada';
    }
  };

  const renderContent = () => (
    <div className="space-y-6">
      {/* Alertas */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {exito}
        </div>
      )}

      {/* Herramientas */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Buscar códigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowScannerModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Scan className="w-4 h-4" />
              Escanear
            </button>
          </div>
        </div>
      </div>

      {/* Lista de códigos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Formato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codigosFiltrados.map((codigo) => (
                  <tr key={codigo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                      {codigo.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        codigo.formato === 'EAN8' ? 'bg-blue-100 text-blue-800' :
                        codigo.formato === 'EAN13' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {codigo.formato}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        codigo.tipo === 'PRODUCTO' ? 'bg-orange-100 text-orange-800' : 'bg-cyan-100 text-cyan-800'
                      }`}>
                        {codigo.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {obtenerNombreEntidad(codigo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => codigo.id && handleEliminarCodigo(codigo.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {codigosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay códigos de barras</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'No se encontraron códigos que coincidan con la búsqueda.' : 'Comienza generando códigos para tus productos.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel lateral con productos/variantes disponibles */}
      {!producto && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Asignar Códigos a Productos/Variantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Productos</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {productos.map(prod => (
                  <div key={prod.idProducto} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{prod.nombre}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEntidadSeleccionada({
                            id: prod.idProducto!,
                            tipo: 'PRODUCTO',
                            nombre: prod.nombre
                          });
                          setShowGenerarCodigo(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded"
                      >
                        Generar
                      </button>
                      <button
                        onClick={() => {
                          setEntidadSeleccionada({
                            id: prod.idProducto!,
                            tipo: 'PRODUCTO',
                            nombre: prod.nombre
                          });
                          setShowAsignarCodigo(true);
                        }}
                        className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded"
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Si hay producto específico, mostrar como modal
  if (producto && onClose) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Códigos de Barras - {producto.nombre}
              </h2>
              <p className="text-sm text-gray-600">
                Gestiona los códigos de barras del producto y sus variantes
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Vista independiente
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Códigos de Barras</h1>
      </div>
      {renderContent()}

      {/* Modales */}
      {showGenerarCodigo && entidadSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Generar Código de Barras</h3>
              <button
                onClick={() => setShowGenerarCodigo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entidad: {entidadSeleccionada.nombre}
                </label>
                <p className="text-sm text-gray-500">Tipo: {entidadSeleccionada.tipo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <select
                  value={formGenerar.formato}
                  onChange={(e) => setFormGenerar(prev => ({ ...prev, formato: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EAN8">EAN-8 (8 dígitos)</option>
                  <option value="EAN13">EAN-13 (13 dígitos)</option>
                  <option value="CODE128">CODE128 (alfanumérico)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowGenerarCodigo(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerarCodigo}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAsignarCodigo && entidadSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Asignar Código de Barras</h3>
              <button
                onClick={() => setShowAsignarCodigo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entidad: {entidadSeleccionada.nombre}
                </label>
                <p className="text-sm text-gray-500">Tipo: {entidadSeleccionada.tipo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <select
                  value={formAsignar.formato}
                  onChange={(e) => setFormAsignar(prev => ({ ...prev, formato: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EAN8">EAN-8 (8 dígitos)</option>
                  <option value="EAN13">EAN-13 (13 dígitos)</option>
                  <option value="CODE128">CODE128 (alfanumérico)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Barras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formAsignar.codigo}
                    onChange={(e) => setFormAsignar(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ingresa el código"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formAsignar.formato === 'EAN8' && (
                    <button
                      onClick={generarEAN8Ejemplo}
                      className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                      title="Generar EAN-8 de ejemplo"
                    >
                      Gen
                    </button>
                  )}
                </div>
                {formAsignar.formato === 'EAN8' && (
                  <p className="text-xs text-gray-500 mt-1">
                    EAN-8 debe tener exactamente 8 dígitos con checksum válido
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAsignarCodigo(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAsignarCodigo}
                  disabled={loading || !formAsignar.codigo.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Escanear Código de Barras</h3>
              <button
                onClick={() => setShowScannerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  placeholder="Escanea o ingresa el código"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleBuscarPorCodigo()}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBuscarPorCodigo}
                  disabled={loading || !scannerInput.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCodigosBarras;
