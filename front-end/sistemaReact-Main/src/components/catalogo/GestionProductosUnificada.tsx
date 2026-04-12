import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Package2, Palette, Ruler, BarChart3, Scan, Eye, X, Trash2 } from 'lucide-react';
import type { Producto } from '../../interfaces/Producto';
import type { Categoria } from '../../interfaces/Categoria';
import type { Proveedor } from '../../interfaces/Proveedor';
import { ProductoService } from '../../services/ProductoServices';
import { CategoriaService } from '../../services/CategoriaServices';
import { ProveedorService } from '../../services/ProveedorServices';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import { useAuthReady } from '../../hooks/useAuthReady';
import { AuthLoadingScreen } from '../auth/AuthLoadingScreen';
import Barcode from 'react-barcode';

// Componentes específicos
import FormularioProducto from '../productos/FormularioProductoUnificado';
import GestionVariantes from '../productos/GestionVariantes';
import GestionColores from '../productos/GestionColores';
import GestionTallas from '../productos/GestionTallas';
import GestionCodigosBarras from './GestionCodigosBarras';

type VistaActiva = 'productos' | 'colores' | 'tallas' | 'codigos';

interface ProductoUnificadoProps {
  className?: string;
}

// Modal de confirmación reutilizable
const ConfirmModal: React.FC<{
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, message, onConfirm, onCancel }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  if (!open) return null;
  
  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative border border-gray-200 transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <button 
          onClick={onCancel} 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition-colors duration-200 hover:bg-gray-100 p-2 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar eliminación</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-center gap-3">
            <button 
              onClick={onCancel} 
              className="px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors duration-200"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm} 
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GestionProductosUnificada: React.FC<ProductoUnificadoProps> = ({ className = '' }) => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();

  // ALL hooks MUST be called before any early return (React Hooks rules)
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
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoBarcode, setProductoBarcode] = useState<Producto | null>(null);

  // Estado para loading de eliminación y feedback
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  // Estado para confirmación de eliminación
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<number | null>(null);

  // Estado para animación del modal
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);

  // Función para cerrar modal de código de barras con animación
  const handleCloseBarcodeModal = () => {
    setIsBarcodeModalVisible(false);
    setTimeout(() => {
      setShowBarcodeModal(false);
      setProductoBarcode(null);
    }, 300);
  };

  // Esperar a que la autenticación esté lista antes de cargar datos
  useEffect(() => {
    if (isReady && isAuthenticated) {
      cargarDatos();
    } else if (isReady && !isAuthenticated) {
      console.log('Usuario no autenticado, redirigiendo a login...');
      window.location.href = '/login';
    }
  }, [isReady, isAuthenticated]);

  // NOW safe to do early return (all hooks above have been called)
  if (authLoading) {
    return <AuthLoadingScreen message="Validando sesión y cargando datos..." />;
  }

  const cargarDatos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos del componente padre...');
      
      const [productosResponse, categoriasResponse, proveedoresResponse] = await Promise.all([
        ProductoService.getAllProductos('ROLE_ADMIN'),
        CategoriaService.obtenerCategoriasPrincipales(),
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
      
      // Si hay un producto seleccionado y un modal abierto, actualizar el producto seleccionado con los datos más recientes
      if (productoSeleccionado && (showVariantes || showCodigosBarras || showFormularioProducto)) {
        const productoActualizado = productosConCantidad.find(p => p.idProducto === productoSeleccionado.idProducto);
        if (productoActualizado) {
          console.log(`🔄 Actualizando producto seleccionado con datos frescos: ${productoActualizado.nombre}`);
          setProductoSeleccionado(productoActualizado);
        }
      }
      
      console.log('✅ Datos del componente padre cargados correctamente');
    } catch (err) {
      setError('Error al cargar los datos');
      console.error('❌ Error al cargar datos del componente padre:', err);
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
  const handleProductoGuardado = (productoGuardado?: Producto) => {
    setShowFormularioProducto(false);
    
    if (productoGuardado) {
      console.log('🔄 Producto guardado recibido en componente padre:', productoGuardado);
      
      // Actualizar productos en el estado con el producto guardado
      setProductos(prevProductos => {
        // Si el producto ya existe, actualizarlo
        if (productoGuardado.idProducto && prevProductos.some(p => p.idProducto === productoGuardado.idProducto)) {
          return prevProductos.map(p => 
            p.idProducto === productoGuardado.idProducto ? productoGuardado : p
          );
        }
        // Si es un producto nuevo, agregarlo a la lista
        return [...prevProductos, productoGuardado];
      });
        // Si el producto guardado es el mismo que estaba seleccionado, actualizar productoSeleccionado
      if (productoSeleccionado && productoSeleccionado.idProducto === productoGuardado.idProducto) {
        setProductoSeleccionado(productoGuardado);
      }
    } else {
      // Si no se recibió un producto, recargar todos los datos
      cargarDatos();
    }
    
    setProductoSeleccionado(null);
  };

  const handleVariantesActualizadas = () => {
    console.log('🔄 Notificación de variantes actualizadas recibida en componente padre');
    // Agregar un pequeño delay para evitar condiciones de carrera
    setTimeout(() => {
      console.log('🔄 Recargando datos del componente padre después de actualización de variantes');
      cargarDatos();
    }, 100);
  };

  const productosFiltrados = useMemo(() => productos.filter(producto => {
    const nombreCategoria = producto.categoria?.nombre ?? producto.categoriaPadre?.nombre ?? '';
    const matchCategoria = !selectedCategoria ||
      nombreCategoria.toLowerCase().includes(selectedCategoria.toLowerCase());
    const matchProveedor = !selectedProveedor ||
      producto.proveedor.nombre.toLowerCase().includes(selectedProveedor.toLowerCase());
    return matchCategoria && matchProveedor;
  }), [productos, selectedCategoria, selectedProveedor]);

  const solicitarEliminarProducto = (idProducto: number) => {
    setProductoAEliminar(idProducto);
    setConfirmModalOpen(true);
  };

  const confirmarEliminarProducto = async () => {
    if (productoAEliminar == null) return;
    setEliminandoId(productoAEliminar);
    setMensajeError(null);
    setMensajeExito(null);
    try {
      await ProductoService.deleteProducto(productoAEliminar);
      setMensajeExito('Producto eliminado correctamente.');
      cargarDatos();
    } catch (err) {
      setMensajeError('Error al eliminar el producto.');
    } finally {
      setEliminandoId(null);
      setProductoAEliminar(null);
      setConfirmModalOpen(false);
      setTimeout(() => setMensajeExito(null), 3000);
    }
  };

  const cancelarEliminarProducto = () => {
    setProductoAEliminar(null);
    setConfirmModalOpen(false);
  };

  const NavButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    activa: boolean;
    onClick: () => void;
  }> = ({ icon, label, activa, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        activa 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25' 
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const renderVistaProductos = () => (
    <div className="space-y-4 lg:space-y-6">
      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-3 lg:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4">
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-3 xl:col-span-3 flex">
            <input
              type="text"
              placeholder="Buscar productos por nombre, código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
              className="flex-1 px-3 py-2 lg:px-4 lg:py-3 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleBuscar}
              className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-r-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Search className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>

          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-3 py-2 lg:px-4 lg:py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">🏷️ Todas las categorías</option>
              {categorias.map(categoria => (
                <option key={categoria.idCategoria} value={categoria.nombre}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 lg:col-span-1 xl:col-span-2">
            <select
              value={selectedProveedor}
              onChange={(e) => setSelectedProveedor(e.target.value)}
              className="w-full px-3 py-2 lg:px-4 lg:py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">🏭 Todos los proveedores</option>
              {proveedores.map(proveedor => (
                <option key={proveedor.idProveedor} value={proveedor.nombre}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center lg:justify-start lg:col-span-1 xl:col-span-1">
            <div className="px-3 py-2 lg:px-4 lg:py-3 bg-blue-50 rounded-lg border border-blue-200 w-full">
              <div className="text-xs lg:text-sm font-semibold text-blue-800 text-center lg:text-left">
                📦 {productosFiltrados.length}
              </div>
            </div>
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
            {mensajeExito && (
              <div className="px-4 py-2 bg-green-100 border border-green-400 text-green-800 rounded mb-4">
                {mensajeExito}
              </div>
            )}
            {mensajeError && (
              <div className="px-4 py-2 bg-red-100 border border-red-400 text-red-800 rounded mb-4">
                {mensajeError}
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Proveedor
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-3 py-2 lg:px-6 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosFiltrados.map((producto, index) => (
                  <tr key={producto.idProducto ?? `producto-${producto.codigoIdentificacion || ''}-${index}`} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.codigoIdentificacion}
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {producto.nombre}
                        </div>
                        {producto.codigoBarras && (
                          <div className="text-xs text-blue-600 font-mono">
                            📊 {producto.codigoBarras}
                          </div>
                        )}
                        {producto.descripcion && (
                          <div className="text-xs lg:text-sm text-gray-500 hidden lg:block">{producto.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {producto.categoria?.nombre ?? producto.categoriaPadre?.nombre ?? 'Sin categoría'}
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                      {producto.proveedor.nombre}
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                      S/ {producto.precioUnitario.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (producto.cantidadTotal ?? 0) > 10 
                          ? 'bg-green-100 text-green-800' 
                          : (producto.cantidadTotal ?? 0) > 0 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.cantidadTotal ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-3 lg:px-6 lg:py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1 lg:space-x-2">
                        <button
                          onClick={() => handleAbrirVariantes(producto)}
                          className="p-1 text-blue-600 hover:text-blue-900 rounded transition-all duration-200"
                          title="Gestionar Variantes"
                        >
                          <Package2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAbrirCodigosBarras(producto)}
                          className="p-1 text-purple-600 hover:text-purple-900 rounded transition-all duration-200"
                          title="Códigos de Barras"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setProductoBarcode(producto);
                            setShowBarcodeModal(true);
                            setTimeout(() => setIsBarcodeModalVisible(true), 10);
                          }}
                          className="p-1 text-gray-600 hover:text-black rounded transition-all duration-200 hidden sm:inline-block"
                          title="Ver código de barras"
                        >
                          <Scan className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditarProducto(producto)}
                          className="p-1 text-indigo-600 hover:text-indigo-900 rounded transition-all duration-200"
                          title="Editar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => producto.idProducto && solicitarEliminarProducto(producto.idProducto)}
                          className="p-1 text-red-600 hover:text-red-900 rounded transition-all duration-200 hidden md:inline-block"
                          title="Eliminar"
                          disabled={eliminandoId === producto.idProducto}
                        >
                          {eliminandoId === producto.idProducto ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {productosFiltrados.length === 0 && (
              <div className="text-center py-8 lg:py-12">
                <Package2 className="mx-auto h-8 w-8 lg:h-12 lg:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No hay productos
                </h3>
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
    <div className={className}>
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Sistema de Gestión de Productos
            </h1>
            <p className="text-sm lg:text-base text-gray-600 mt-1">
              Gestión completa de productos, variantes, colores, tallas y códigos de barras
            </p>
          </div>
          <button
            onClick={handleNuevoProducto}
            className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-sm lg:text-base"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex flex-wrap gap-2 p-3 lg:p-4 bg-white rounded-xl shadow-md border border-gray-200 mb-4 lg:mb-6">          <NavButton
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
        <div className="min-h-[400px] lg:min-h-[500px]">
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
              console.log('🚪 Cerrando modal de variantes');
              setShowVariantes(false);
              
              // Actualizar datos inmediatamente al cerrar el modal de variantes
              if (productoSeleccionado?.idProducto) {
                console.log(`🔄 Actualizando datos después de cerrar modal de variantes para producto ID: ${productoSeleccionado.idProducto}`);
                cargarDatos();
              }
              
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

      {showBarcodeModal && productoBarcode && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ${isBarcodeModalVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative border border-gray-200 transform transition-all duration-300 ${isBarcodeModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <button
              onClick={handleCloseBarcodeModal}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition-colors duration-200 hover:bg-gray-100 p-2 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold mb-4 text-center">Código de Barras</h2>
            <div className="flex flex-col items-center">
              <Barcode value={productoBarcode.codigoIdentificacion} width={2} height={80} fontSize={18} />
              <div className="mt-2 text-center text-sm text-gray-700">{productoBarcode.codigoIdentificacion}</div>
              <div className="mt-1 text-xs text-gray-500">{productoBarcode.nombre}</div>
            </div>
          </div>
        </div>)}

      {/* Modal de confirmación */}
      <ConfirmModal
        open={confirmModalOpen}
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        onConfirm={confirmarEliminarProducto}
        onCancel={cancelarEliminarProducto}
      />
    </div>
  );
};

export default GestionProductosUnificada;
