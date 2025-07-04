import { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Package,
  CreditCard,
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
import { useAuthReady } from '../hooks/useAuthReady';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';
import ModalHacerMayorista from '../components/mayoristas/ModalHacerMayorista';

// Importar tipos
import type { Producto } from '../interfaces/Producto';
import type { Venta } from '../interfaces/Venta';
import type { Usuario } from '../interfaces/Usuario';
import type { Proveedor } from '../interfaces/Proveedor';

const DashboardAdmin = () => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();
  
  // Estados para los datos
  const [periodo] = useState('semana'); // Fijo en semana
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
  
  // Estado para el modal de mayorista
  const [modalMayoristaAbierto, setModalMayoristaAbierto] = useState(false);
  const [clientePreseleccionado, setClientePreseleccionado] = useState<any>(null);
  
  // Estados para top clientes
  const [topClientes, setTopClientes] = useState<{id: number, nombre: string, documento: string, tipoCliente: string, totalCompras: number}[]>([]);
  const [topClientesPorCompras, setTopClientesPorCompras] = useState<{id: number, nombre: string, documento: string, tipoCliente: string, cantidadCompras: number}[]>([]);
  const [modoVisualizacion, setModoVisualizacion] = useState<'monto' | 'cantidad'>('monto');
  
  // Función para abrir modal con cliente preseleccionado
  const abrirModalConCliente = (cliente: any) => {
    // Convertir el formato del cliente del dashboard al formato esperado por el modal
    const clienteFormateado = {
      idCliente: cliente.id,
      nombreCliente: cliente.nombre,
      numeroDocumento: cliente.documento,
      tipoCliente: cliente.tipoCliente || 'Cliente'
    };
    
    setClientePreseleccionado(clienteFormateado);
    setModalMayoristaAbierto(true);
  };
  
  // Cargar datos al montar el componente o cambiar el periodo
  useEffect(() => {
    if (!isReady) return;
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    const cargarDatos = async () => {
      setCargando(true);
      setError(null);
      
      try {        // Cargar productos
        const productosResponse = await ProductoService.getAllProductos();
        const productosData = Array.isArray(productosResponse) ? productosResponse : [];
        setProductos(productosData);
        
        // Cargar ventas según el período seleccionado
        let ventasData: Venta[] = [];
        
        try {
          if (periodo === 'hoy') {
            // Cargar solo las ventas del día actual
            const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
            console.log('Cargando ventas del día:', fechaActual);
            const ventasResponse = await VentaService.obtenerVentasPorFecha(fechaActual);
            ventasData = Array.isArray(ventasResponse) ? ventasResponse : [];
            console.log(`Ventas del día cargadas: ${ventasData.length}`);
          } else if (periodo === 'semana') {
            // Cargar todas las ventas y filtrar los últimos 7 días
            console.log('Cargando ventas de la última semana');
            const todasLasVentas = await VentaService.obtenerTodasVentas();
            const todasVentasArray = Array.isArray(todasLasVentas) ? todasLasVentas : [];
            
            const fechaActual = new Date();
            const hace7Dias = new Date();
            hace7Dias.setDate(fechaActual.getDate() - 7);
            
            ventasData = todasVentasArray.filter(venta => {
              const fechaVenta = new Date(venta.fechaVenta);
              return fechaVenta >= hace7Dias && fechaVenta <= fechaActual;
            });
            console.log(`Ventas de la semana cargadas: ${ventasData.length}`);
          } else if (periodo === 'mes') {
            // Cargar todas las ventas y filtrar el mes actual
            console.log('Cargando ventas del mes actual');
            const todasLasVentas = await VentaService.obtenerTodasVentas();
            const todasVentasArray = Array.isArray(todasLasVentas) ? todasLasVentas : [];
            
            const fechaActual = new Date();
            const inicioDelMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
            const finDelMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
            
            ventasData = todasVentasArray.filter(venta => {
              const fechaVenta = new Date(venta.fechaVenta);
              return fechaVenta >= inicioDelMes && fechaVenta <= finDelMes;
            });
            console.log(`Ventas del mes cargadas: ${ventasData.length}`);
          }
        } catch (error) {
          console.log('Error al cargar ventas específicas, cargando todas las ventas como fallback');
          const ventasResponse = await VentaService.obtenerTodasVentas();
          ventasData = Array.isArray(ventasResponse) ? ventasResponse : [];
        }
        
        setVentas(ventasData);
        
        // Cargar usuarios con roles
        const usuariosResponse = await ServicioUsuarios.obtenerUsuariosConRoles();
        
        // Convertir usuarios del backend al formato del frontend
        const usuariosData: Usuario[] = Array.isArray(usuariosResponse) 
          ? usuariosResponse.map((usuarioBackend: any) => ({
              id: usuarioBackend.id,
              usuario: usuarioBackend.usuario,
              activo: usuarioBackend.activo ?? true,
              roles: Array.isArray(usuarioBackend.roles) 
                ? usuarioBackend.roles.map((rolStr: string) => ({
                    nombreRol: rolStr.replace('ROLE_', '') as any
                  }))
                : []
            }))
          : [];
        
        setUsuarios(usuariosData);
        
        // Cargar proveedores
        const proveedoresResponse = await ProveedorService.obtenerTodosProveedores();
        const proveedoresData = Array.isArray(proveedoresResponse) ? proveedoresResponse : [];
        setProveedores(proveedoresData);
        
        // Calcular métricas de ventas
        calcularMetricas(ventasData);
        
        // Generar actividad reciente solo con las últimas ventas
        generarActividadReciente(ventasData);
        
        // Generar datos de gráficos
        generarDatosGraficos(ventasData);
        
        // Calcular top 5 clientes
        calcularTopClientes(ventasData);
        
        // Calcular top 5 clientes por cantidad de compras
        calcularTopClientesPorCantidad(ventasData);
        
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Ocurrió un error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setCargando(false);
      }
    };    
    cargarDatos();
  }, [periodo, isReady, isAuthenticated]);
  
  // Si aún está cargando la autenticación, mostrar pantalla de carga
  if (authLoading) {
    return <AuthLoadingScreen message="Cargando dashboard administrativo..." />;
  }
  
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
    const totalVentas = ventasData.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
    
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
    const clientesUnicos = new Set(
      ventasData
        .map(venta => venta.cliente?.idCliente) // Obtener IDs de clientes, puede ser undefined
        .filter(id => id !== undefined) // Filtrar undefined
    ).size;
    
    setMetricasVenta({
      totalVentas,
      productosVendidos,
      clientesNuevos: clientesUnicos, // Esto es una aproximación
      ticketPromedio
    });
  };
  
  // Generar actividad reciente solo con las últimas ventas
  const generarActividadReciente = (ventas: Venta[]) => {
    // Solo mostrar las últimas 7 ventas
    const ventasRecientes = [...ventas]
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
      .slice(0, 7)
      .map(venta => ({
        tipo: 'venta',
        titulo: 'Venta registrada',
        detalle: `Venta #${venta.idVenta} - S/ ${(venta.totalVentas ?? 0).toFixed(2)}`,
        fecha: new Date(venta.fechaVenta).toLocaleDateString(),
        usuario: venta.usuario?.usuario ?? 'Usuario desconocido',
        estado: 'Completado',
        icono: 'venta'
      }));
    
    setActividadReciente(ventasRecientes);
  };
  
  // Generar datos para los gráficos según el período seleccionado
  const generarDatosGraficos = (ventasData: Venta[]) => {
    // Si no hay ventas, establecer valores por defecto
    if (!ventasData || ventasData.length === 0) {
      if (periodo === 'hoy') {
        setDatosVentas([0]); // Solo el día actual
      } else if (periodo === 'semana') {
        setDatosVentas([0, 0, 0, 0, 0, 0, 0]); // 7 días de la semana
      } else {
        setDatosVentas([0, 0, 0, 0]); // 4 semanas del mes
      }
      return;
    }

    if (periodo === 'hoy') {
      // Para "hoy", mostrar el total del día
      const totalDelDia = ventasData.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
      setDatosVentas([totalDelDia]);
    } else if (periodo === 'semana') {
      // Para "semana", agrupar por días de la semana (últimos 7 días)
      const diasSemana = [0, 0, 0, 0, 0, 0, 0]; // Lun, Mar, Mié, Jue, Vie, Sáb, Dom
      
      ventasData.forEach(venta => {
        const fecha = new Date(venta.fechaVenta);
        const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
        const indexAjustado = diaSemana === 0 ? 6 : diaSemana - 1; // Convertir a: 0 = lunes, ..., 6 = domingo
        diasSemana[indexAjustado] += (venta.totalVentas ?? 0);
      });
      
      setDatosVentas(diasSemana);
    } else if (periodo === 'mes') {
      // Para "mes", agrupar por semanas del mes
      const fechaActual = new Date();
      const inicioDelMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      const finDelMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
      
      // Dividir el mes en 4 semanas aproximadas
      const semanasMes = [0, 0, 0, 0];
      
      ventasData.forEach(venta => {
        const fechaVenta = new Date(venta.fechaVenta);
        if (fechaVenta >= inicioDelMes && fechaVenta <= finDelMes) {
          const diaDelMes = fechaVenta.getDate();
          let semanaIndex = Math.floor((diaDelMes - 1) / 7); // Dividir en semanas de 7 días
          semanaIndex = Math.min(semanaIndex, 3); // Asegurar que no exceda el índice 3
          semanasMes[semanaIndex] += (venta.totalVentas ?? 0);
        }
      });
      
      setDatosVentas(semanasMes);
    }
  };

  // Calcular top 5 clientes compradores
  const calcularTopClientes = (ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientes([]);
      return;
    }

    // Agrupar ventas por cliente y sumar totales
    const clientesMap = new Map<number, {nombre: string, documento: string, tipoCliente: string, totalCompras: number}>();
    
    ventasData.forEach(venta => {
      if (venta.cliente?.idCliente) {
        const clienteId = venta.cliente.idCliente;
        const clienteNombre = venta.cliente.nombreCliente;
        const clienteDocumento = venta.cliente.numeroDocumento || clienteId.toString();
        const clienteTipo = venta.cliente.tipoCliente || 'Cliente';
        const totalVenta = venta.totalVentas ?? 0;
        
        if (clientesMap.has(clienteId)) {
          const cliente = clientesMap.get(clienteId)!;
          cliente.totalCompras += totalVenta;
        } else {
          clientesMap.set(clienteId, {
            nombre: clienteNombre,
            documento: clienteDocumento,
            tipoCliente: clienteTipo,
            totalCompras: totalVenta
          });
        }
      }
    });

    // Convertir a array y ordenar por total de compras descendente
    const clientesArray = Array.from(clientesMap.entries()).map(([id, data]) => ({
      id,
      nombre: data.nombre,
      documento: data.documento,
      tipoCliente: data.tipoCliente,
      totalCompras: data.totalCompras
    }));

    clientesArray.sort((a, b) => b.totalCompras - a.totalCompras);

    // Tomar los primeros 5
    setTopClientes(clientesArray.slice(0, 5));
  };

  // Calcular top 5 clientes por cantidad de compras
  const calcularTopClientesPorCantidad = (ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientesPorCompras([]);
      return;
    }

    // Agrupar ventas por cliente y contar cantidad de compras
    const clientesMap = new Map<number, {nombre: string, documento: string, tipoCliente: string, cantidadCompras: number, montoTotal: number}>();
    
    ventasData.forEach(venta => {
      if (venta.cliente?.idCliente) {
        const clienteId = venta.cliente.idCliente;
        const clienteNombre = venta.cliente.nombreCliente;
        const clienteDocumento = venta.cliente.numeroDocumento || clienteId.toString();
        const clienteTipo = venta.cliente.tipoCliente || 'Cliente';
        const totalVenta = venta.totalVentas ?? 0;
        
        if (clientesMap.has(clienteId)) {
          const cliente = clientesMap.get(clienteId)!;
          cliente.cantidadCompras += 1;
          cliente.montoTotal += totalVenta;
        } else {
          clientesMap.set(clienteId, {
            nombre: clienteNombre,
            documento: clienteDocumento,
            tipoCliente: clienteTipo,
            cantidadCompras: 1,
            montoTotal: totalVenta
          });
        }
      }
    });

    // Convertir a array y ordenar por cantidad de compras descendente
    const clientesArray = Array.from(clientesMap.entries()).map(([id, data]) => ({
      id,
      nombre: data.nombre,
      documento: data.documento,
      tipoCliente: data.tipoCliente,
      cantidadCompras: data.cantidadCompras
    }));

    clientesArray.sort((a, b) => b.cantidadCompras - a.cantidadCompras);

    // Tomar los primeros 5
    setTopClientesPorCompras(clientesArray.slice(0, 5));
  };

  // Obtener etiquetas para el gráfico según el período
  const obtenerEtiquetasGrafico = () => {
    if (periodo === 'hoy') {
      return ['Hoy'];
    } else if (periodo === 'semana') {
      return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    } else if (periodo === 'mes') {
      return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    }
    return [];
  };

  // Calcular el valor máximo para el eje Y del gráfico
  const obtenerValorMaximoGrafico = () => {
    const maxValue = Math.max(...datosVentas, 100);
    return Math.ceil(maxValue / 100) * 100; // Redondear hacia arriba a la centena más cercana
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
      {/* Cabecera con título */}
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
      </div>

      {/* Sección de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <TarjetaMetrica 
          titulo="Ventas totales" 
          valor={`S/ ${metricasVenta.totalVentas.toFixed(2)}`}
          descripcion="Ventas de la semana"
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
            <h2 className="text-lg font-semibold text-gray-900">Ventas de la semana</h2>
            <div className="flex gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 mr-2 shadow-sm"></div>
                <span className="text-xs text-gray-600 font-medium">Ventas (semana)</span>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                Total: S/{metricasVenta.totalVentas.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="h-64 relative bg-gradient-to-t from-gray-50 to-transparent rounded-lg">
            {/* Mensaje cuando no hay datos */}
            {datosVentas.length === 0 || datosVentas.every(v => v === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No hay datos de ventas para mostrar</p>
                  <p className="text-gray-400 text-xs mt-1">No hay ventas esta semana</p>
                </div>
              </div>
            ) : (
              <>
                {/* Líneas de guía horizontales */}
                <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border-b border-gray-100 opacity-50 w-full"></div>
                  ))}
                </div>
                
                {/* Gráfico de barras con datos reales */}
                <div className="absolute inset-0 flex items-end justify-center pb-8 px-4">
                  <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 w-full max-w-4xl">
                    {datosVentas.map((valor, i) => {
                      const etiquetas = obtenerEtiquetasGrafico();
                      const maxValue = obtenerValorMaximoGrafico();
                      const alturaPixeles = maxValue > 0 ? Math.max((valor / maxValue) * 180, 4) : 4;
                      
                      return (
                        <div key={`${periodo}-${i}`} className="flex flex-col items-center group">
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-12 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                            {etiquetas[i] || ''}: S/{valor.toFixed(2)}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                          
                          {/* Barra */}
                          <div 
                            className="w-8 sm:w-10 md:w-12 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-lg hover:from-blue-600 hover:to-blue-500 transition-all duration-300 ease-out hover:scale-105 cursor-pointer"
                            style={{ 
                              height: `${alturaPixeles}px`,
                              minHeight: '4px'
                            }}
                          ></div>
                          
                          {/* Etiqueta */}
                          <div className="text-xs text-gray-600 mt-2 text-center font-medium">
                            {etiquetas[i] || ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Eje Y dinámico mejorado */}
                <div className="absolute left-2 inset-y-0 flex flex-col justify-between py-4 pr-2">
                  {(() => {
                    const maxValue = obtenerValorMaximoGrafico();
                    if (maxValue === 0) {
                      return [0, 0, 0, 0, 0].map((_, index) => (
                        <div key={index} className="text-xs text-gray-400 font-medium">
                          S/0
                        </div>
                      ));
                    }
                    const steps = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
                    return steps.map((value, index) => (
                      <div key={index} className="text-xs text-gray-500 font-medium bg-white px-1 rounded">
                        S/{value >= 1000 ? (value/1000).toFixed(1) + 'k' : value.toFixed(0)}
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Estadísticas de Usuarios</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Total: {usuarios.length}
            </span>
          </div>
          
          <div className="space-y-4">
            {/* Usuarios activos */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Usuarios activos</span>
                </div>
                <span className="text-sm font-semibold text-green-700">
                  {usuarios.filter(u => u.activo).length} / {usuarios.length}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${usuarios.length > 0 ? (usuarios.filter(u => u.activo).length / usuarios.length) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Distribución de usuarios por rol */}
            {[
              { rol: 'ADMIN', icono: '👑', color: 'amber', nombre: 'Administradores' },
              { rol: 'ALMACENERO', icono: '📦', color: 'blue', nombre: 'Almaceneros' },
              { rol: 'CAJERO', icono: '💰', color: 'purple', nombre: 'Cajeros' }
            ].map(({ rol, icono, color, nombre }) => {
              const usuariosConRol = usuarios.filter(u => 
                u.roles && u.roles.some(r => r.nombreRol === rol)
              );
              
              const porcentaje = usuarios.length > 0 
                ? (usuariosConRol.length / usuarios.length) * 100 
                : 0;
              
              const colorClasses = {
                amber: { bg: 'bg-amber-50', border: 'border-amber-100', bar: 'bg-gradient-to-r from-amber-500 to-yellow-400', barBg: 'bg-amber-200', text: 'text-amber-700' },
                blue: { bg: 'bg-blue-50', border: 'border-blue-100', bar: 'bg-gradient-to-r from-blue-500 to-blue-400', barBg: 'bg-blue-200', text: 'text-blue-700' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-100', bar: 'bg-gradient-to-r from-purple-500 to-purple-400', barBg: 'bg-purple-200', text: 'text-purple-700' }
              };
              
              const colorClass = colorClasses[color as keyof typeof colorClasses];
              
              return (
                <div key={rol} className={`${colorClass.bg} p-3 rounded-lg border ${colorClass.border}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="mr-2 text-sm">{icono}</span>
                      <span className="text-sm font-medium text-gray-700">{nombre}</span>
                    </div>
                    <span className={`text-sm font-semibold ${colorClass.text}`}>
                      {usuariosConRol.length} ({porcentaje.toFixed(0)}%)
                    </span>
                  </div>
                  <div className={`w-full ${colorClass.barBg} rounded-full h-2`}>
                    <div 
                      className={`${colorClass.bar} h-2 rounded-full transition-all duration-500`} 
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            
            {/* Información adicional */}
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="text-center">
                  <div className="font-medium text-gray-700">
                    {usuarios.filter(u => !u.activo).length}
                  </div>
                  <div>Inactivos</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-700">
                    {usuarios.filter(u => u.activo && u.roles && u.roles.length > 1).length}
                  </div>
                  <div>Multi-rol</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestión de Clientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Clientes</h2>
          <div className="flex items-center space-x-4">
            {/* Toggle para modo de visualización */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setModoVisualizacion('monto')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  modoVisualizacion === 'monto'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Por Monto
              </button>
              <button
                onClick={() => setModoVisualizacion('cantidad')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  modoVisualizacion === 'cantidad'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Por Cantidad
              </button>
            </div>
          </div>
        </div>
        
        {/* Descripción del modo actual */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-700">
            {modoVisualizacion === 'monto' 
              ? '📊 Mostrando los 5 clientes que más dinero han gastado en compras'
              : '🛒 Mostrando los 5 clientes que más compras han realizado (número de transacciones)'
            }
          </p>
        </div>
        
        {(modoVisualizacion === 'monto' ? topClientes : topClientesPorCompras).length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <div className="text-gray-400 mb-2">
              <Users size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">No hay datos de clientes para mostrar</p>
            <p className="text-gray-400 text-xs mt-1">No hay ventas registradas con clientes</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {(modoVisualizacion === 'monto' ? topClientes : topClientesPorCompras).map((cliente, index) => (
                <div key={cliente.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                        'bg-gradient-to-r from-blue-400 to-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cliente.nombre}</h3>
                      <p className="text-sm text-gray-500">Cliente #{cliente.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {modoVisualizacion === 'monto' ? (
                        <>
                          <div className="text-lg font-bold text-gray-900">
                            S/ {('totalCompras' in cliente) ? cliente.totalCompras.toFixed(2) : '0.00'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total gastado
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-lg font-bold text-gray-900">
                            {('cantidadCompras' in cliente) ? cliente.cantidadCompras : 0} {(('cantidadCompras' in cliente) ? cliente.cantidadCompras : 0) === 1 ? 'compra' : 'compras'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Número de transacciones
                          </div>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => abrirModalConCliente(cliente)}
                      className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-md hover:shadow-lg"
                      title="Gestionar este cliente"
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Botón para gestionar cliente */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    setClientePreseleccionado(null);
                    setModalMayoristaAbierto(true);
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <Users size={18} />
                  <span>Gestionar Cliente</span>
                </button>
              </div>
            </div>
          </>
        )}
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
      
      {/* Modal para hacer mayorista un cliente */}
      <ModalHacerMayorista
        isOpen={modalMayoristaAbierto}
        onClose={() => {
          setModalMayoristaAbierto(false);
          setClientePreseleccionado(null);
        }}
        onSuccess={() => {
          setModalMayoristaAbierto(false);
          setClientePreseleccionado(null);
          // Opcional: recargar datos si es necesario
        }}
        clientePreseleccionado={clientePreseleccionado}
      />
    </div>
  );
};

export default DashboardAdmin;