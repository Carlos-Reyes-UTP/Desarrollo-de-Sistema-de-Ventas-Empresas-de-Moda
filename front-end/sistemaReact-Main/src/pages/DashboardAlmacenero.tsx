import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  PackageCheck,
  Bookmark,
  ShoppingCart,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip, Legend, BarChart, Bar 
} from 'recharts';
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
  const navigate = useNavigate();
  
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard solo cuando la autenticación esté lista  // ===== FUNCIONES DEFINIDAS ANTES DE LOS useEffect =====
  
  const cargarInventarioReciente = async () => {
    try {
      console.log('Cargando inventario reciente...');
      const inventario = await DashboardService.obtenerProductosInventario(50); // Cargar más productos para mejor búsqueda
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
      
      // Cargar inventario adicional para la tabla de búsqueda
      await cargarInventarioReciente();
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
  );  // Filtrar inventario reciente según búsqueda (solo para la tabla)
  const inventarioFiltrado = inventarioReciente;

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
          <button 
            onClick={() => navigate('/pages/productos?openModal=true')}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
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
        {/* Distribución de inventario - con gráfico pequeño */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Categoría</h2>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoriaStats.length ? categoriaStats : [
                    { idCategoria: 1, nombre: 'Ropa Colegio', porcentaje: 33 },
                    { idCategoria: 2, nombre: 'Ropa de Verano', porcentaje: 25 },
                    { idCategoria: 3, nombre: 'Ropa de Invierno', porcentaje: 25 },
                    { idCategoria: 4, nombre: 'Ropa Deportiva', porcentaje: 17 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="porcentaje"
                  nameKey="nombre"
                  label={({name, percent}) => `${name}: ${(percent !== undefined ? (percent * 100).toFixed(0) : 0)}%`}
                >
                  {categoriaStats.length ? (
                    categoriaStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#f59e0b'][index % 5]} />
                    ))
                  ) : (
                    [
                      <Cell key="cell-0" fill="#3b82f6" />,
                      <Cell key="cell-1" fill="#8b5cf6" />,
                      <Cell key="cell-2" fill="#10b981" />,
                      <Cell key="cell-3" fill="#f97316" />
                    ]
                  )}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Porcentaje']}
                  labelFormatter={(name) => `${name}`} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(categoriaStats.length ? categoriaStats : [
              { idCategoria: 1, nombre: 'Ropa Colegio', porcentaje: 33 },
              { idCategoria: 2, nombre: 'Ropa de Verano', porcentaje: 25 },
              { idCategoria: 3, nombre: 'Ropa de Invierno', porcentaje: 25 },
              { idCategoria: 4, nombre: 'Ropa Deportiva', porcentaje: 17 }
            ]).map((categoria, index) => (
              <div key={categoria.idCategoria} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2`} style={{ 
                  backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#f59e0b'][index % 5]
                }}></div>
                <span className="text-xs text-gray-600">{categoria.nombre}: {categoria.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Estado del inventario - Nuevo gráfico */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Estado de Inventario</h2>
          </div>
          
          <div className="flex justify-center mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'Normal', valor: estadoInventario.normal || 25, color: '#10b981' },
                  { name: 'Bajo', valor: estadoInventario.bajo || 0, color: '#f59e0b' },
                  { name: 'Crítico', valor: estadoInventario.critico || 33, color: '#ef4444' },
                  { name: 'Sin Stock', valor: estadoInventario.sinStock || 42, color: '#9ca3af' }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <Bar dataKey="valor" name="Porcentaje">
                  {[
                    <Cell key="cell-0" fill="#10b981" />,
                    <Cell key="cell-1" fill="#f59e0b" />,
                    <Cell key="cell-2" fill="#ef4444" />,
                    <Cell key="cell-3" fill="#9ca3af" />
                  ]}
                </Bar>
                <Tooltip formatter={(value) => [`${value}%`, 'Porcentaje']} />
                <Legend formatter={(value) => `${value}`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm font-medium text-green-700">Normal</span>
              </div>
              <p className="text-xl font-bold text-green-600 mt-1">{estadoInventario.normal || 25}%</p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm font-medium text-yellow-700">Bajo</span>
              </div>
              <p className="text-xl font-bold text-yellow-600 mt-1">{estadoInventario.bajo || 0}%</p>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm font-medium text-red-700">Crítico</span>
              </div>
              <p className="text-xl font-bold text-red-600 mt-1">{estadoInventario.critico || 33}%</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                <span className="text-sm font-medium text-gray-700">Sin Stock</span>
              </div>
              <p className="text-xl font-bold text-gray-600 mt-1">{estadoInventario.sinStock || 42}%</p>
            </div>
          </div>
        </div>
        
        {/* Productos con stock crítico */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alertas de Stock</h2>
          </div>
          
          <div className="space-y-4">
            {inventarioReciente.filter(p => p.estado === 'critico' || p.estado === 'sin-stock').slice(0, 3).map((producto) => (
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
          
          {inventarioReciente.some(p => p.estado === 'critico' || p.estado === 'sin-stock') && (
            <button 
              onClick={() => navigate('/pages/productos?stockFilter=critico')}
              className="w-full mt-4 py-2 text-sm text-center text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium"
            >
              🚨 Gestionar Stock Crítico
            </button>
          )}
        </div>
      </div>

      {/* Inventario reciente con búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-0">Inventario Reciente</h2>
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
              {inventarioFiltrado.slice(-6).map((item) => (
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
        {/* Botón central para ver inventario completo */}
        <div className="flex justify-center mt-6">
          <button 
            onClick={() => navigate('/pages/productos')}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Ver el inventario completo
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardAlmacenero;