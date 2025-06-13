import React, { useState, useEffect } from 'react';
import { Plus, Search, Package2, Palette, Ruler, BarChart3, Scan, Eye } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProductoService } from '../../services/ProductoServices';
import { CategoriaService } from '../../services/CategoriaServices';
import { ProveedorService } from '../../services/ProveedorServices';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';

// Componentes específicos
import FormularioProducto from '../productos/FormularioProducto';
import GestionVariantes from '../productos/GestionVariantes';
import GestionColores from '../productos/GestionColores';
import GestionTallas from '../productos/GestionTallas';
import GestionCodigosBarras from './GestionCodigosBarras';

type VistaActiva = 'productos' | 'colores' | 'tallas' | 'codigos';

interface ProductoUnificadoProps {
  className?: string;
}

const GestionProductosUnificada: React.FC<ProductoUnificadoProps> = ({ className = '' }) => {
  // Estados principales
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');

  // Estados para modales (separados por z-index)
  const [showFormularioProducto, setShowFormularioProducto] = useState(false);
  const [showVariantes, setShowVariantes] = useState(false);
  const [showCodigosBarras, setShowCodigosBarras] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

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
      );

      setProductos(productosConCantidad);
      setCategorias(categoriasData);
      setProveedores(proveedoresData);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };  const handleBuscar = async () => {
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

  const handleAbrirVariantes = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setShowVariantes(true);
  };

  const handleAbrirCodigosBarras = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setShowCodigosBarras(true);
  };

  const handleEditarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setShowFormularioProducto(true);
  };

  const handleNuevoProducto = () => {
    setProductoSeleccionado(null);
    setShowFormularioProducto(true);
  };

  const handleProductoGuardado = () => {
    setShowFormularioProducto(false);
    setProductoSeleccionado(null);
    cargarDatos();
  };

  const handleVariantesActualizadas = () => {
    cargarDatos();
  };

  const productosFiltrados = productos.filter(producto => {
    const matchCategoria = !selectedCategoria || 
      producto.categoria.nombre.toLowerCase().includes(selectedCategoria.toLowerCase());
    const matchProveedor = !selectedProveedor || 
      producto.proveedor.nombre.toLowerCase().includes(selectedProveedor.toLowerCase());
    return matchCategoria && matchProveedor;
  });
  const NavButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    activa: boolean;
    onClick: () => void;
  }> = ({ icon, label, activa, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        activa 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const renderVistaProductos = () => (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4">
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
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
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
                        {producto.descripcion && (
                          <div className="text-sm text-gray-500">{producto.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.categoria.nombre}
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
                          onClick={() => handleAbrirVariantes(producto)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Gestionar Variantes"
                        >
                          <Package2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAbrirCodigosBarras(producto)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Códigos de Barras"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditarProducto(producto)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Editar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {productosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <Package2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda.' : 'Comienza creando un nuevo producto.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Gestión de Productos</h1>
            <p className="text-gray-600 mt-1">Gestión completa de productos, variantes, colores, tallas y códigos de barras</p>
          </div>
          <button
            onClick={handleNuevoProducto}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-100 rounded-lg">          <NavButton
            icon={<Package2 className="w-4 h-4" />}
            label="Productos"
            activa={vistaActiva === 'productos'}
            onClick={() => setVistaActiva('productos')}
          />
          <NavButton
            icon={<Palette className="w-4 h-4" />}
            label="Colores"
            activa={vistaActiva === 'colores'}
            onClick={() => setVistaActiva('colores')}
          />
          <NavButton
            icon={<Ruler className="w-4 h-4" />}
            label="Tallas"
            activa={vistaActiva === 'tallas'}
            onClick={() => setVistaActiva('tallas')}
          />
          <NavButton
            icon={<Scan className="w-4 h-4" />}
            label="Códigos de Barras"
            activa={vistaActiva === 'codigos'}
            onClick={() => setVistaActiva('codigos')}
          />
        </div>

        {/* Contenido principal */}
        <div className="min-h-[500px]">
          {vistaActiva === 'productos' && renderVistaProductos()}
          {vistaActiva === 'colores' && <GestionColores />}
          {vistaActiva === 'tallas' && <GestionTallas />}
          {vistaActiva === 'codigos' && <GestionCodigosBarras />}
        </div>
      </div>

      {/* Modales con z-index separados */}
      {showFormularioProducto && (
        <div style={{ zIndex: 1000 }}>
          <FormularioProducto
            producto={productoSeleccionado}
            categorias={categorias}
            proveedores={proveedores}
            onClose={() => {
              setShowFormularioProducto(false);
              setProductoSeleccionado(null);
            }}
            onProductoGuardado={handleProductoGuardado}
          />
        </div>
      )}

      {showVariantes && productoSeleccionado && (
        <div style={{ zIndex: 2000 }}>
          <GestionVariantes
            producto={productoSeleccionado}
            onClose={() => {
              setShowVariantes(false);
              setProductoSeleccionado(null);
            }}
            onVariantesActualizadas={handleVariantesActualizadas}
          />
        </div>
      )}

      {showCodigosBarras && productoSeleccionado && (
        <div style={{ zIndex: 3000 }}>
          <GestionCodigosBarras
            producto={productoSeleccionado}
            onClose={() => {
              setShowCodigosBarras(false);
              setProductoSeleccionado(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default GestionProductosUnificada;
