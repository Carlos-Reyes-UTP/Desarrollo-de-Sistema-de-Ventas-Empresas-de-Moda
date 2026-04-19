import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  Users,
  Package,
  CreditCard,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';

// Importar servicios
import { ProductoService } from '../services/ProductoServices';
import { VentaService } from '../services/VentaServices';
import { ServicioUsuarios } from '../services/UsuarioServices';
import { useAuthReady } from '../hooks/useAuthReady';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';


import ModalHacerMayorista from '../components/mayoristas/ModalHacerMayorista';

// Importar tipos
import type { Producto } from '../interfaces/Producto';
import type { Venta } from '../interfaces/Venta';
import type { Usuario } from '../interfaces/Usuario';

// Memoized metric card component (extracted to prevent re-renders)
const TarjetaMetrica = React.memo(({
  titulo,
  valor,
  descripcion,
  icono
}: {
  titulo: string;
  valor: string;
  descripcion: string;
  icono: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="text-gray-500">{titulo}</div>
      <div className="p-2 bg-gray-100 rounded-lg">{icono}</div>
    </div>
    <div className="flex items-baseline">
      <div className="text-2xl font-bold text-gray-900">{valor}</div>
    </div>
    <div className="text-sm text-gray-500 mt-1">{descripcion}</div>
  </div>
));

const DashboardAdmin = () => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();
  const navigate = useNavigate();

  // Estados para los datos
  const [periodo] = useState('semana'); // Fijo en semana
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para datos de API
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

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
  const [cargandoGrafico] = useState(false);
  const [datosGraficoSemanal, setDatosGraficoSemanal] = useState<Array<{ label: string, ventas: number }>>([]);

  // Estado para el modal de mayorista
  const [modalMayoristaAbierto, setModalMayoristaAbierto] = useState(false);
  const [clientePreseleccionado, setClientePreseleccionado] = useState<any>(null);

  // Estados para top clientes
  const [topClientes, setTopClientes] = useState<{ id: number, nombre: string, documento: string, tipoCliente: string, totalCompras: number }[]>([]);
  const [topClientesPorCompras, setTopClientesPorCompras] = useState<{ id: number, nombre: string, documento: string, tipoCliente: string, cantidadCompras: number }[]>([]);
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

      try {        
        // Cargar solo los 5 productos más recientes para el panel inferior
        const productosPaginados = await ProductoService.getProductosPaginados(0, 5, '', 'ROLE_ADMIN');
        setProductos(productosPaginados.content || []);

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

        // Calcular métricas de ventas
        calcularMetricas(ventasData);

        // Generar datos del gráfico semanal
        procesarDatosGraficoSemanal(ventasData);

        // Generar actividad reciente solo con las últimas ventas
        generarActividadReciente(ventasData);

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

  // Generar actividad reciente solo con las últimas 5 ventas
  const generarActividadReciente = (ventas: Venta[]) => {
    // Solo mostrar las últimas 5 ventas
    const ventasRecientes = [...ventas]
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
      .slice(0, 5)
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

  // Función para procesar datos del gráfico semanal (como en Reportes)
  const procesarDatosGraficoSemanal = (ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      const datosVacios = [
        { label: 'Dom', ventas: 0 },
        { label: 'Lun', ventas: 0 },
        { label: 'Mar', ventas: 0 },
        { label: 'Mié', ventas: 0 },
        { label: 'Jue', ventas: 0 },
        { label: 'Vie', ventas: 0 },
        { label: 'Sáb', ventas: 0 }
      ];
      setDatosGraficoSemanal(datosVacios);
      return;
    }

    // Obtener la fecha actual y calcular el inicio de la semana (domingo)
    const ahora = new Date();
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    const datos = [];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let dia = 0; dia < 7; dia++) {
      const fechaDia = new Date(inicioSemana);
      fechaDia.setDate(inicioSemana.getDate() + dia);
      fechaDia.setHours(0, 0, 0, 0);

      const fechaDiaFin = new Date(fechaDia);
      fechaDiaFin.setHours(23, 59, 59, 999);

      const ventasDia = ventasData.filter(venta => {
        const fechaVenta = new Date(venta.fechaVenta);
        return fechaVenta >= fechaDia && fechaVenta <= fechaDiaFin;
      });

      datos.push({
        label: diasSemana[dia],
        ventas: ventasDia.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0)
      });
    }

    setDatosGraficoSemanal(datos);
  };

  // Calcular top 10 clientes compradores
  const calcularTopClientes = (ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientes([]);
      return;
    }

    // Agrupar ventas por cliente y sumar totales
    const clientesMap = new Map<number, { nombre: string, documento: string, tipoCliente: string, totalCompras: number }>();

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

    // Tomar los primeros 10
    setTopClientes(clientesArray.slice(0, 10));
  };

  // Calcular top 10 clientes por cantidad de compras
  const calcularTopClientesPorCantidad = (ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientesPorCompras([]);
      return;
    }

    // Agrupar ventas por cliente y contar cantidad de compras
    const clientesMap = new Map<number, { nombre: string, documento: string, tipoCliente: string, cantidadCompras: number, montoTotal: number }>();

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

    // Tomar los primeros 10
    setTopClientesPorCompras(clientesArray.slice(0, 10));
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

  // Función para formatear moneda
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  };

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Cabecera con título */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 pl-4">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Admin
            </span>
          </div>
          <p className="text-gray-500 mt-1 pl-4">{obtenerFecha()}</p>
        </div>
      </div>

      {/* Sección de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <TarjetaMetrica
          titulo="Ventas totales"
          valor={formatearMoneda(metricasVenta.totalVentas)}
          descripcion="Ventas de la semana"
          icono={<DollarSign size={20} className="text-green-600" />}
        />
        <TarjetaMetrica
          titulo="Productos vendidos"
          valor={metricasVenta.productosVendidos.toString()}
          descripcion="Total de artículos vendidos"
          icono={<Package size={20} className="text-blue-600" />}
        />
        <TarjetaMetrica
          titulo="Clientes nuevos"
          valor={metricasVenta.clientesNuevos.toString()}
          descripcion="Total de nuevos clientes"
          icono={<Users size={20} className="text-purple-600" />}
        />
        <TarjetaMetrica
          titulo="Ticket promedio"
          valor={formatearMoneda(metricasVenta.ticketPromedio)}
          descripcion="Valor promedio de venta"
          icono={<CreditCard size={20} className="text-yellow-600" />}
        />
      </div>

      {/* Gráfico de ventas y estadísticas de usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Ventas por Día</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              Semanal
            </div>
          </div>

          <div className="h-80">
            {cargandoGrafico ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === 'ventas' ? formatearMoneda(Number(value)) : value,
                      name === 'ventas' ? 'Ventas' : 'Cantidad'
                    ]}
                  />
                  <Bar dataKey="ventas" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
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
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${modoVisualizacion === 'monto'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                Por Monto
              </button>
              <button
                onClick={() => setModoVisualizacion('cantidad')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${modoVisualizacion === 'cantidad'
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
              ? '📊 Mostrando los 10 clientes que más dinero han gastado en compras'
              : '🛒 Mostrando los 10 clientes que más compras han realizado (número de transacciones)'
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
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
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
                            {formatearMoneda('totalCompras' in cliente ? cliente.totalCompras : 0)}
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
                        <div className={`h-8 w-8 rounded-full ${actividad.tipo === 'producto' ? 'bg-blue-100' :
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actividad.estado === 'Completado' ? 'bg-green-100 text-green-800' :
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
          <button
            onClick={() => navigate('/pages/reportes?tab=ventas')} 
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${producto.cantidad > 10 ? 'bg-green-100 text-green-800' :
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
          <button
            onClick={() => navigate('/pages/productos')}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
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