import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, X } from 'lucide-react';
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

  const handleBuscar = async () => {
    if (!searchTerm.trim()) {
      cargarDatos();
      return;
    }

    try {
      setLoading(true);
      const resultadosResponse = await ProductoService.buscarProductosCompleto(searchTerm, 'ROLE_ADMIN');
      
      // Validar que la respuesta es un array
      const resultados = Array.isArray(resultadosResponse) ? resultadosResponse : [];
      setProductos(resultados);
    } catch (err) {
      setError('Error al buscar productos');
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
    const matchCategoria = !selectedCategoria || 
      producto.categoria.nombre.toLowerCase().includes(selectedCategoria.toLowerCase());
    const matchProveedor = !selectedProveedor || 
      producto.proveedor.nombre.toLowerCase().includes(selectedProveedor.toLowerCase());
    return matchCategoria && matchProveedor;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleBuscar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
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

          <div className="text-sm text-gray-600 flex items-center">
            Total: {productosFiltrados.length} productos
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
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
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
                  </td>                  <td className="px-6 py-4 whitespace-nowrap">
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
                    {producto.categoria.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.marca || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.proveedor.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    S/ {producto.precioUnitario.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (producto.cantidadTotal || 0) > 10 
                        ? 'bg-green-100 text-green-800' 
                        : (producto.cantidadTotal || 0) > 0 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {producto.cantidadTotal || 0}
                    </span>
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
