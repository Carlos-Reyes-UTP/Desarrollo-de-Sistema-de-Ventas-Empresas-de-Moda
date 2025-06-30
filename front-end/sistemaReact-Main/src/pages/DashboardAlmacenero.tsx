import { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowRightCircle,
  PackageCheck,
  Bookmark,
  Search,
  ShoppingCart,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { DashboardService } from '../services/DashboardService';
import { useAuthReady } from '../hooks/useAuthReady';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';
import type { 
  ProductoStats, 
  CategoriaDistribucion, 
  EstadoInventario, 
  ProductoInventario, 
  ActividadReciente 
} from '../interfaces/DashboardStats';

const DashboardAlmacenero = () => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();
  
  // Estados para datos reales del API - TODOS LOS HOOKS PRIMERO
  const [productosData, setProductosData] = useState<ProductoStats>({
    total: 0,
    bajoStock: 0,
    sinStock: 0,
    categorias: 0,
    ultimoMes: 0
  });
  
  const [categoriaStats, setCategoriaStats] = useState<CategoriaDistribucion[]>([]);
  const [estadoInventario, setEstadoInventario] = useState<EstadoInventario>({
    normal: 0,
    bajo: 0,
    critico: 0,
    sinStock: 0
  });
  const [inventarioReciente, setInventarioReciente] = useState<ProductoInventario[]>([]);
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard solo cuando la autenticación esté lista  // ===== FUNCIONES DEFINIDAS ANTES DE LOS useEffect =====
  
  const cargarInventarioReciente = async () => {
    try {
      console.log('Cargando inventario reciente con búsqueda:', busqueda);
      const inventario = await DashboardService.obtenerProductosInventario(20, busqueda);
      console.log('Inventario cargado:', inventario.length, 'productos');
      setInventarioReciente(inventario);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setInventarioReciente([]); // Establecer array vacío en caso de error
    }
  };
  const cargarDatosDashboard = async () => {
    setCargando(true);
    setError(null);
    
    try {
      console.log('Iniciando carga de datos del dashboard...');
      
      // Cargar todas las estadísticas en paralelo
      const [
        estadisticasProductos,
        distribucionCategorias,
        estadoInventarioData,
        inventario,
        actividad
      ] = await Promise.all([
        DashboardService.obtenerEstadisticasProductos().catch(err => {
          console.error('Error en estadísticas de productos:', err);
          return { total: 0, bajoStock: 0, sinStock: 0, categorias: 0, ultimoMes: 0 };
        }),
        DashboardService.obtenerDistribucionCategorias().catch(err => {
          console.error('Error en distribución de categorías:', err);
          return [];
        }),
        DashboardService.obtenerEstadoInventario().catch(err => {
          console.error('Error en estado del inventario:', err);
          return { normal: 0, bajo: 0, critico: 0, sinStock: 0 };
        }),
        DashboardService.obtenerProductosInventario(20).catch(err => {
          console.error('Error en productos del inventario:', err);
          return [];
        }),
        DashboardService.obtenerActividadReciente().catch(err => {
          console.error('Error en actividad reciente:', err);
          return [];
        })
      ]);

      console.log('Datos cargados exitosamente:', {
        estadisticasProductos,
        distribucionCategorias,
        estadoInventarioData,
        inventario: inventario.length,
        actividad: actividad.length
      });

      setProductosData(estadisticasProductos);
      setCategoriaStats(distribucionCategorias);
      setEstadoInventario(estadoInventarioData);
      setInventarioReciente(inventario);
      setActividadReciente(actividad);
    } catch (err: any) {
      console.error('Error general al cargar datos del dashboard:', err);
      setError('Error al cargar los datos del dashboard. Verifique su conexión e intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  // ===== useEffect HOOKS =====

  useEffect(() => {
    if (isReady && isAuthenticated) {
      cargarDatosDashboard();
    } else if (isReady && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isReady, isAuthenticated]);

  // Cargar datos del inventario cuando cambia la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarInventarioReciente();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [busqueda]);
  // Si aún está cargando la autenticación, mostrar pantalla de carga
  if (authLoading) {
    return <AuthLoadingScreen message="Cargando dashboard del almacenero..." />;
  }

  const actualizarDatos = async () => {
    await cargarDatosDashboard();
  };

  // Componente de tarjeta con métrica
  const TarjetaMetrica = ({ 
    titulo, 
    valor, 
    descripcion, 
    icono, 
    colorIcono 
  }: { 
    titulo: string; 
    valor: string | number; 
    descripcion?: string; 
    icono: React.ReactNode; 
    colorIcono: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{valor}</p>
          {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorIcono}`}>
          {icono}
        </div>
      </div>
    </div>
  );  // Filtrar inventario reciente según búsqueda
  const inventarioFiltrado = inventarioReciente.filter(item => 
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'normal':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Normal</span>;
      case 'bajo':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Bajo</span>;
      case 'critico':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Crítico</span>;
      case 'sin-stock':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Sin Stock</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{estado}</span>;
    }
  };

  const getActividadIcon = (tipo: string) => {
    switch (tipo) {
      case 'producto_actualizado':
        return <Package size={16} className="text-blue-600" />;
      case 'producto_creado':
        return <PlusCircle size={16} className="text-green-600" />;
      case 'venta_realizada':
        return <ShoppingCart size={16} className="text-purple-600" />;
      case 'stock_bajo':
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'stock_critico':
        return <AlertTriangle size={16} className="text-red-600" />;
      default:
        return <Package size={16} className="text-gray-600" />;
    }
  };

  const formatearFecha = (fecha: string) => {
    const now = new Date();
    const fechaActividad = new Date(fecha);
    const diferencia = now.getTime() - fechaActividad.getTime();
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 60) {
      return `Hace ${minutos} min`;
    } else if (horas < 24) {
      return `Hace ${horas} horas`;
    } else {
      return `Hace ${dias} días`;
    }
  };

  if (cargando) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button 
                onClick={actualizarDatos}
                className="mt-3 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Cabecera con título */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Almacén</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Almacenero
            </span>
          </div>
          <p className="text-gray-500 mt-1">Gestión de inventario y recepciones</p>
        </div>
          <div className="mt-4 md:mt-0 flex gap-2">
          <button 
            onClick={actualizarDatos}
            disabled={cargando}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`mr-2 ${cargando ? 'animate-spin' : ''}`} /> 
            {cargando ? 'Actualizando...' : 'Actualizar Datos'}
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            <PlusCircle size={16} className="mr-2" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tarjetas métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <TarjetaMetrica 
          titulo="Total Productos" 
          valor={productosData.total}
          icono={<Package className="h-6 w-6 text-white" />}
          colorIcono="bg-blue-500"
        />
          <TarjetaMetrica 
          titulo="Bajo Stock" 
          valor={productosData.bajoStock}
          descripcion="Requieren reposición"
          icono={<AlertTriangle className="h-6 w-6 text-white" />}
          colorIcono="bg-red-500"
        />
        
        <TarjetaMetrica 
          titulo="Categorías" 
          valor={productosData.categorias}
          icono={<Bookmark className="h-6 w-6 text-white" />}
          colorIcono="bg-purple-500"
        />
        
        <TarjetaMetrica 
          titulo="Sin Stock" 
          valor={productosData.sinStock}
          descripcion="Productos agotados"
          icono={<PackageCheck className="h-6 w-6 text-white" />}
          colorIcono="bg-orange-500"
        />
      </div>

      {/* Inventario y Recepciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Distribución de inventario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Categoría</h2>          <div className="space-y-4">
            {categoriaStats.map((categoria) => (
              <div key={categoria.idCategoria}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{categoria.nombre}</span>
                  <span className="text-sm font-medium">{categoria.porcentaje}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${categoria.porcentaje}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Estado del Inventario</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-xs text-gray-600">Normal: {estadoInventario.normal}%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-xs text-gray-600">Bajo: {estadoInventario.bajo}%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-xs text-gray-600">Crítico: {estadoInventario.critico}%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                <span className="text-xs text-gray-600">Sin Stock: {estadoInventario.sinStock}%</span>
              </div>
            </div>
          </div>
        </div>        
        {/* Actividad reciente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          
          <div className="space-y-4">
            {actividadReciente.map((actividad) => (
              <div key={actividad.id} className="flex">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  {getActividadIcon(actividad.tipo)}
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">{actividad.descripcion}</p>
                  {actividad.detalles && (
                    <p className="text-xs text-gray-500">{actividad.detalles}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatearFecha(actividad.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 py-2 text-sm text-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
            Ver todo el historial
          </button>
        </div>
        
        {/* Productos con stock crítico */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alertas de Stock</h2>
            <button className="text-sm text-red-600 hover:text-red-800 flex items-center">
              Ver todas <ArrowRightCircle size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {inventarioReciente.filter(p => p.estado === 'critico' || p.estado === 'sin-stock').slice(0, 4).map((producto) => (
              <div key={producto.idProducto} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <AlertTriangle size={16} className={`mr-2 ${producto.estado === 'sin-stock' ? 'text-gray-500' : 'text-red-500'}`} />
                      <span className="font-medium text-gray-900">{producto.nombre}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{producto.categoria}</p>
                  </div>
                  <div>
                    {getEstadoBadge(producto.estado)}
                  </div>
                </div>                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Stock: {producto.stock} unidades</span>
                  <span>S/ {producto.precioUnitario.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 py-2 text-sm text-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
            Gestionar Stock Crítico
          </button>
        </div>
      </div>

      {/* Inventario reciente con búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-0">Inventario Reciente</h2>
          
          <div className="w-full sm:w-64 relative">
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
              </tr>
            </thead><tbody className="bg-white divide-y divide-gray-200">
              {inventarioFiltrado.map((item) => (
                <tr key={item.idProducto} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center mr-3">
                        <Package size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <span className="font-medium">{item.nombre}</span>
                        <p className="text-xs text-gray-500">{item.codigoIdentificacion}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {item.categoria}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {item.stock} unidades
                      {item.stock <= 5 && (
                        <AlertTriangle size={14} className="ml-2 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getEstadoBadge(item.estado)}
                  </td>                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <span>S/ {item.precioUnitario.toFixed(2)}</span>
                      {item.marca && (
                        <p className="text-xs text-gray-400">{item.marca}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Anterior
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Siguiente
            </button>
          </div>          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">1</span> a <span className="font-medium">{Math.min(inventarioFiltrado.length, 20)}</span> de <span className="font-medium">{inventarioFiltrado.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-gray-800 text-sm font-medium text-white">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  2
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  3
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAlmacenero;