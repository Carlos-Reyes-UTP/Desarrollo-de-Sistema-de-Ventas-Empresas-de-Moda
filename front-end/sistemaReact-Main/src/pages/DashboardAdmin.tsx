import { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  Users,
  Package,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Importar servicios
import { ProductoService } from '../services/ProductoServices';
import { VentaService } from '../services/VentaServices';
import { ServicioUsuarios } from '../services/UsuarioServices';
import { ProveedorService } from '../services/ProveedorServices';

// Importar tipos
import type { Producto } from '../interfaces/Producto';
import type { Venta } from '../interfaces/Venta';
import type { Usuario } from '../interfaces/Usuario';
import type { Proveedor } from '../interfaces/Proveedor';

const DashboardAdmin = () => {
  // Estados para los datos
  const [periodo, setPeriodo] = useState('hoy');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para datos de API
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  // Estados para métricas
  const [metricasVenta, setMetricasVenta] = useState({
    totalVentas: 0,
    productosVendidos: 0,
    clientesNuevos: 0,
    ticketPromedio: 0
  });
  
  // Estados para actividad reciente
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);
  
  // Estados para los gráficos
  const [datosVentas, setDatosVentas] = useState<number[]>([]);
  
  // Cargar datos al montar el componente o cambiar el periodo
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError(null);
      
      try {        // Cargar productos
        const productosResponse = await ProductoService.getAllProductos();
        const productosData = Array.isArray(productosResponse) ? productosResponse : [];
        setProductos(productosData);
        
        // Cargar ventas (podríamos filtrar por fecha según el periodo)
        // Para propósitos de demostración, solo cargamos todas las ventas
        const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        let ventasData: Venta[] = [];
        
        try {
          // Intentar obtener ventas por fecha (si está implementado)
          const ventasResponse = await VentaService.obtenerVentasPorFecha(fechaActual);
          ventasData = Array.isArray(ventasResponse) ? ventasResponse : [];
        } catch (error) {
          console.log('No se pudieron obtener ventas por fecha, cargando todas las ventas');
          const ventasResponse = await VentaService.obtenerTodasVentas();
          ventasData = Array.isArray(ventasResponse) ? ventasResponse : [];
        }
        
        setVentas(ventasData);
        
        // Cargar usuarios
        const usuariosResponse = await ServicioUsuarios.obtenerTodos();
        const usuariosData = Array.isArray(usuariosResponse) ? usuariosResponse : [];
        setUsuarios(usuariosData);
        
        // Cargar proveedores
        const proveedoresResponse = await ProveedorService.obtenerTodosProveedores();
        const proveedoresData = Array.isArray(proveedoresResponse) ? proveedoresResponse : [];
        setProveedores(proveedoresData);
        
        // Calcular métricas de ventas
        calcularMetricas(ventasData);
        
        // Generar actividad reciente combinando diferentes tipos de datos
        generarActividadReciente(productosData, ventasData, usuariosData);
        
        // Generar datos de gráficos
        generarDatosGraficos(ventasData);
        
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Ocurrió un error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatos();
  }, [periodo]);
  
  // Calcular métricas a partir de los datos de ventas
  const calcularMetricas = (ventasData: Venta[]) => {
    // Si no hay ventas, establecer valores por defecto
    if (!ventasData || ventasData.length === 0) {
      setMetricasVenta({
        totalVentas: 0,
        productosVendidos: 0,
        clientesNuevos: 0,
        ticketPromedio: 0
      });
      return;
    }
    
    // Calcular total de ventas
    const totalVentas = ventasData.reduce((sum, venta) => sum + venta.totalVentas, 0);
    
    // Calcular total de productos vendidos
    const productosVendidos = ventasData.reduce((sum, venta) => {
      // Si la venta tiene detalles, sumamos las cantidades
      if (venta.detalles && venta.detalles.length > 0) {
        return sum + venta.detalles.reduce((detSum, detalle) => detSum + detalle.cantidad, 0);
      }
      return sum;
    }, 0);
    
    // Calcular ticket promedio
    const ticketPromedio = ventasData.length > 0 ? totalVentas / ventasData.length : 0;
    
    // Clientes únicos (basados en el ID del cliente)
    const clientesUnicos = new Set(ventasData.map(venta => venta.cliente.idCliente)).size;
    
    setMetricasVenta({
      totalVentas,
      productosVendidos,
      clientesNuevos: clientesUnicos, // Esto es una aproximación
      ticketPromedio
    });
  };
  
  // Generar actividad reciente combinando diferentes datos
  const generarActividadReciente = (productos: Producto[], ventas: Venta[], usuarios: Usuario[]) => {
    const actividad = [];
    
    // Añadir productos recientes (últimos 5)
    const productosRecientes = [...productos]
      .sort((a, b) => (b.idProducto || 0) - (a.idProducto || 0))
      .slice(0, 5)
      .map(producto => ({
        tipo: 'producto',
        titulo: 'Producto añadido',
        detalle: `${producto.nombre} - ID #${producto.idProducto}`,
        fecha: new Date().toLocaleDateString(), // En un caso real, esto vendría de la base de datos
        usuario: 'Sistema', // En un caso real, esto sería el usuario que lo añadió
        estado: 'Completado',
        icono: 'producto'
      }));
    
    // Añadir ventas recientes (últimas 5)
    const ventasRecientes = [...ventas]
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
      .slice(0, 5)
      .map(venta => ({
        tipo: 'venta',
        titulo: 'Venta registrada',
        detalle: `Venta #${venta.idVenta} - S/ ${venta.totalVentas.toFixed(2)}`,
        fecha: new Date(venta.fechaVenta).toLocaleDateString(),
        usuario: venta.usuario.usuario,
        estado: 'Completado',
        icono: 'venta'
      }));
    
    // Combinar y ordenar por fecha más reciente
    actividad.push(...productosRecientes, ...ventasRecientes);
    actividad.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    setActividadReciente(actividad.slice(0, 10)); // Tomar los 10 más recientes
  };
  
  // Generar datos para los gráficos
  const generarDatosGraficos = (ventasData: Venta[]) => {
    // Si no hay ventas, establecer valores por defecto
    if (!ventasData || ventasData.length === 0) {
      setDatosVentas([0, 0, 0, 0, 0, 0, 0]);
      return;
    }
    
    // Agrupar ventas por día de la semana
    const diasSemana = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mié, Jue, Vie, Sáb, Dom
    
    ventasData.forEach(venta => {
      const fecha = new Date(venta.fechaVenta);
      const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const indexAjustado = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a: 0 = lunes, ..., 6 = domingo
      diasSemana[indexAjustado] += venta.totalVentas;
    });
    
    setDatosVentas(diasSemana);
  };

  // Obtener la fecha actual con formato
  const obtenerFecha = () => {
    const opciones: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('es-ES', opciones);
  };

  // Componente de tarjeta con métrica
  const TarjetaMetrica = ({ 
    titulo, 
    valor, 
    descripcion, 
    icono, 
    tendencia 
  }: { 
    titulo: string; 
    valor: string; 
    descripcion: string; 
    icono: React.ReactNode; 
    tendencia?: { valor: string; positiva: boolean }
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{titulo}</div>
        <div className="p-2 bg-gray-100 rounded-lg">{icono}</div>
      </div>
      <div className="flex items-baseline">
        <div className="text-2xl font-bold text-gray-900 mr-2">{valor}</div>
        {tendencia && (
          <div className={`text-sm font-medium flex items-center ${
            tendencia.positiva ? 'text-green-600' : 'text-red-600'
          }`}>
            {tendencia.positiva ? (
              <ArrowUpRight size={16} className="mr-1" />
            ) : (
              <ArrowDownRight size={16} className="mr-1" />
            )}
            {tendencia.valor}
          </div>
        )}
      </div>
      <div className="text-sm text-gray-500 mt-1">{descripcion}</div>
    </div>
  );

  // Estado de la aplicación
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600">Cargando información del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar los datos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Cabecera con título y selector de período */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Admin
            </span>
          </div>
          <p className="text-gray-500 mt-1">{obtenerFecha()}</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg flex p-1 shadow-sm">
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              periodo === 'hoy' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setPeriodo('hoy')}
          >
            Hoy
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              periodo === 'semana' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setPeriodo('semana')}
          >
            Esta semana
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              periodo === 'mes' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setPeriodo('mes')}
          >
            Este mes
          </button>
        </div>
      </div>

      {/* Sección de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <TarjetaMetrica 
          titulo="Ventas totales" 
          valor={`S/ ${metricasVenta.totalVentas.toFixed(2)}`}
          descripcion={periodo === 'hoy' ? 'Ventas del día' : periodo === 'semana' ? 'Ventas de la semana' : 'Ventas del mes'}
          icono={<DollarSign size={20} className="text-green-600" />}
          tendencia={{ valor: "8.2%", positiva: true }}
        />
        <TarjetaMetrica 
          titulo="Productos vendidos" 
          valor={metricasVenta.productosVendidos.toString()}
          descripcion="Total de artículos vendidos"
          icono={<Package size={20} className="text-blue-600" />}
          tendencia={{ valor: "5.1%", positiva: true }}
        />
        <TarjetaMetrica 
          titulo="Clientes nuevos" 
          valor={metricasVenta.clientesNuevos.toString()}
          descripcion="Total de nuevos clientes"
          icono={<Users size={20} className="text-purple-600" />}
          tendencia={{ valor: "2.5%", positiva: false }}
        />
        <TarjetaMetrica 
          titulo="Ticket promedio" 
          valor={`S/ ${metricasVenta.ticketPromedio.toFixed(2)}`}
          descripcion="Valor promedio de venta"
          icono={<CreditCard size={20} className="text-yellow-600" />}
          tendencia={{ valor: "3.7%", positiva: true }}
        />
      </div>

      {/* Gráfico de ventas y estadísticas de usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Ventas del periodo</h2>
            <div className="flex gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-xs text-gray-600">Este periodo</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                <span className="text-xs text-gray-600">Periodo anterior</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 relative">
            {/* Gráfico de barras con datos reales */}
            <div className="absolute inset-0 flex items-end justify-around pb-10 px-6">
              {datosVentas.map((valor, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-blue-500 rounded-t-md transition-all duration-500 ease-in-out"
                    style={{ height: `${Math.min(valor, 200)}px` }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Eje Y */}
            <div className="absolute left-0 inset-y-0 flex flex-col justify-between py-4">
              <div className="text-xs text-gray-400">S/100</div>
              <div className="text-xs text-gray-400">S/75</div>
              <div className="text-xs text-gray-400">S/50</div>
              <div className="text-xs text-gray-400">S/25</div>
              <div className="text-xs text-gray-400">S/0</div>
            </div>
            
            {/* Líneas de guía */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
              <div className="border-b border-gray-100 h-0"></div>
              <div className="border-b border-gray-100 h-0"></div>
              <div className="border-b border-gray-100 h-0"></div>
              <div className="border-b border-gray-100 h-0"></div>
              <div className="border-b border-gray-100 h-0"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Estadísticas de Usuarios</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Usuarios activos</span>
                <span className="text-sm font-medium">
                  {usuarios.filter(u => u.activo).length} / {usuarios.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${usuarios.length > 0 ? (usuarios.filter(u => u.activo).length / usuarios.length) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Distribución de usuarios por rol */}
            {['ADMIN', 'ALMACENERO', 'CAJERO'].map((rol, index) => {
              const usuariosConRol = usuarios.filter(u => 
                u.roles && u.roles.some(r => r.nombreRol === rol)
              );
              
              const porcentaje = usuarios.length > 0 
                ? (usuariosConRol.length / usuarios.length) * 100 
                : 0;
              
              const colores = ['bg-yellow-500', 'bg-blue-500', 'bg-purple-500'];
              
              return (
                <div key={rol}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-500">{rol}</span>
                    <span className="text-sm font-medium">
                      {usuariosConRol.length} / {usuarios.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${colores[index]} h-2 rounded-full`} 
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Actividad Reciente</h2>
        
        {actividadReciente.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No hay actividad reciente para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Acción</th>
                  <th className="pb-3">Detalles</th>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actividadReciente.map((actividad, index) => (
                  <tr key={index} className="text-sm">
                    <td className="py-3 pr-4">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full ${
                          actividad.tipo === 'producto' ? 'bg-blue-100' : 
                          actividad.tipo === 'venta' ? 'bg-green-100' : 'bg-gray-100'
                        } flex items-center justify-center mr-3`}>
                          {actividad.usuario.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{actividad.usuario}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{actividad.titulo}</td>
                    <td className="py-3 pr-4 text-gray-500">{actividad.detalle}</td>
                    <td className="py-3 pr-4 text-gray-500">{actividad.fecha}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        actividad.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                        actividad.estado === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {actividad.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            Ver todas las actividades
          </button>
        </div>
      </div>
      
      {/* Panel de productos recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Productos Recientes</h2>
        
        {productos.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No hay productos para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Nombre</th>
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3">Precio</th>
                  <th className="pb-3">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.slice(0, 5).map((producto) => (
                  <tr key={producto.idProducto} className="text-sm">
                    <td className="py-3 pr-4">#{producto.idProducto}</td>
                    <td className="py-3 pr-4">{producto.nombre}</td>
                    <td className="py-3 pr-4">{producto.codigoIdentificacion}</td>
                    <td className="py-3 pr-4">{producto.categoria?.nombre || 'Sin categoría'}</td>
                    <td className="py-3 pr-4">S/ {producto.precioUnitario.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        producto.cantidad > 10 ? 'bg-green-100 text-green-800' :
                        producto.cantidad > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {producto.cantidad} unidades
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
            Ver todos los productos
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;