import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, X } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProductoService } from '../../services/ProductoServices';
import { CategoriaService } from '../../services/CategoriaServices';
import { ProveedorService } from '../../services/ProveedorServices';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import FormularioProductoUnificado from './FormularioProductoUnificado'
import GestionVariantes from './GestionVariantes';

const GestionProductos: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'nombre' | 'codigo'>('nombre');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [showFormulario, setShowFormulario] = useState(false);
  const [showVariantes, setShowVariantes] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoVariantes, setProductoVariantes] = useState<Producto | null>(null);  const [error, setError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<number | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Limpiar búsqueda cuando se cambia el tipo de búsqueda
  useEffect(() => {
    setSearchTerm('');
  }, [searchType]);
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosResponse, categoriasResponse, proveedoresResponse] = await Promise.all([
        ProductoService.getAllProductos('ROLE_ADMIN'),
        CategoriaService.obtenerTodasCategorias(),
        ProveedorService.obtenerTodosProveedores()
      ]);

      // Validar que las respuestas son arrays
      const productosData = Array.isArray(productosResponse) ? productosResponse : [];
      const categoriasData = Array.isArray(categoriasResponse) ? categoriasResponse : [];
      const proveedoresData = Array.isArray(proveedoresResponse) ? proveedoresResponse : [];

      // Cargar cantidad total para cada producto
      const productosConCantidad = await Promise.all(
        productosData.map(async (producto) => {
          if (producto.idProducto) {
            try {
              const cantidadTotal = await ProductoVarianteService.obtenerCantidadTotalProducto(producto.idProducto);
              return { ...producto, cantidadTotal };
            } catch {
              return { ...producto, cantidadTotal: 0 };
            }
          }
          return producto;
        })
      );      setProductos(productosConCantidad);
      setCategorias(categoriasData);
      setProveedores(proveedoresData);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const solicitarEliminarProducto = (idProducto: number) => {
    setProductoAEliminar(idProducto);
    setConfirmModalOpen(true);
  };

  const confirmarEliminarProducto = async () => {
    if (productoAEliminar == null) return;
    try {
      await ProductoService.deleteProducto(productoAEliminar);
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar el producto:', err);
      setError('Error al eliminar el producto.');
    } finally {
      setProductoAEliminar(null);
      setConfirmModalOpen(false);
    }
  };

  const cancelarEliminarProducto = () => {
    setProductoAEliminar(null);
    setConfirmModalOpen(false);
  };
  const handleProductoGuardado = () => {
    setShowFormulario(false);
    setProductoEditar(null);
    cargarDatos();
  };

  const productosFiltrados = productos.filter(producto => {
    // Filtro por nombre o código según la selección del usuario
    let matchBusqueda = true;
    if (searchTerm) {
      if (searchType === 'nombre') {
        matchBusqueda = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (searchType === 'codigo') {
        matchBusqueda = producto.codigoIdentificacion.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }
    
    // Obtener el nombre de la categoría desde categoria o categoriaPadre
    const nombreCategoria = producto.categoria?.nombre ?? producto.categoriaPadre?.nombre ?? '';
    const matchCategoria = !selectedCategoria || 
      nombreCategoria.toLowerCase().includes(selectedCategoria.toLowerCase());
    const matchProveedor = !selectedProveedor || 
      producto.proveedor.nombre.toLowerCase().includes(selectedProveedor.toLowerCase());
    
    return matchBusqueda && matchCategoria && matchProveedor;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
        <button
          onClick={() => setShowFormulario(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="col-span-2 flex gap-0">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'nombre' | 'codigo')}
              className="px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
            >
              <option value="nombre">🏷️ Nombre</option>
              <option value="codigo">🔢 Código</option>
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={searchType === 'nombre' ? "Ej: Camiseta, Pantalón..." : "Ej: PROD001, CAM123..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border-l-0 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(categoria => (
              <option key={categoria.idCategoria} value={categoria.nombre}>
                {categoria.nombre}
              </option>
            ))}
          </select>

          <select
            value={selectedProveedor}
            onChange={(e) => setSelectedProveedor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map(proveedor => (
              <option key={proveedor.idProveedor} value={proveedor.nombre}>
                {proveedor.nombre}
              </option>
            ))}
          </select>

          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>Total: {productosFiltrados.length} productos</span>
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {searchType === 'nombre' ? 'Nombre' : 'Código'}: "{searchTerm}"
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sub Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Unitario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Cuarto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio ½ Docena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Docena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosFiltrados.map((producto) => (
                <tr key={producto.idProducto} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {producto.codigoIdentificacion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.codigoBarras && (
                        <div className="text-xs text-blue-600 font-mono">📊 {producto.codigoBarras}</div>
                      )}
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.categoriaPadre?.nombre ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.categoria?.nombre ?? '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.marca ?? 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.proveedor.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold text-green-600">S/ {producto.precioUnitario.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioCuarto ? (
                      <span className="text-blue-600">S/ {producto.precioCuarto.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioMediaDocena ? (
                      <span className="text-purple-600">S/ {producto.precioMediaDocena.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.precioDocena ? (
                      <span className="text-orange-600">S/ {producto.precioDocena.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const cantidad = producto.cantidadTotal ?? 0;
                      let claseStock = '';
                      if (cantidad > 10) {
                        claseStock = 'bg-green-100 text-green-800';
                      } else if (cantidad > 0) {
                        claseStock = 'bg-yellow-100 text-yellow-800';
                      } else {
                        claseStock = 'bg-red-100 text-red-800';
                      }
                      
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${claseStock}`}>
                          {cantidad}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setProductoVariantes(producto);
                          setShowVariantes(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Gestionar Variantes"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setProductoEditar(producto);
                          setShowFormulario(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => producto.idProducto && solicitarEliminarProducto(producto.idProducto)}
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
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda.' : 'Comienza creando un nuevo producto.'}
            </p>
          </div>
        )}
      </div>

      {/* Modales */}
      {showFormulario && (
        <FormularioProductoUnificado
          producto={productoEditar}
          categorias={categorias}
          proveedores={proveedores}
          onClose={() => {
            setShowFormulario(false);
            setProductoEditar(null);
          }}
          onProductoGuardado={handleProductoGuardado}
        />
      )}

      {showVariantes && productoVariantes && (
        <GestionVariantes
          producto={productoVariantes}
          onClose={() => {
            setShowVariantes(false);
            setProductoVariantes(null);
          }}
          onVariantesActualizadas={cargarDatos}
        />      )}

      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarProducto}
        onCancel={cancelarEliminarProducto}
      />
    </div>
  );
};

const ConfirmModal: React.FC<{
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm relative">
        <button onClick={onCancel} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <div className="text-lg font-semibold mb-4 text-center">Confirmar acción</div>
        <div className="mb-6 text-center text-gray-700">{message}</div>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium">Eliminar</button>
        </div>
      </div>
    </div>
  );
};

export default GestionProductos;
