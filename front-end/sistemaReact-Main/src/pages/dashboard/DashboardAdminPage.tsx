import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  Users,
  Package,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Calendar,
  UserPlus,
  History,
  LayoutDashboard
} from 'lucide-react';

import ModalHacerMayorista from '@/components/mayoristas/ModalHacerMayorista';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingScreen } from '@/shared/auth/AuthLoadingScreen';
import { MetricCardsSkeleton, ChartSkeleton } from '@/shared/ui';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { UsuarioService } from '@/services/UsuarioService';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { Usuario } from '@/types/Usuario';
import type { Cliente } from '@/types/Cliente';
import type { RolNombre } from '@/types/enums';

// Estilos para la barra de desplazamiento personalizada
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c5c5c5;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a0a0a0;
  }
`;

interface ActividadVenta {
  id: number;
  tipo: string;
  titulo: string;
  detalle: string;
  monto: number;
  fecha: string;
  usuario: string;
  cliente: string;
}

interface ClienteMetrica {
  id: number;
  nombre: string;
  documento: string;
  tipoCliente: string;
  totalCompras?: number;
  cantidadCompras?: number;
}

const DashboardAdminPage = () => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Estados para los datos
  const [cargando, setCargando] = useState(true);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  // Estados para datos de API
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Estados para métricas
  const [metricasVenta, setMetricasVenta] = useState({
    totalVentas: 0,
    productosVendidos: 0,
    clientesNuevos: 0,
    ticketPromedio: 0
  });

  // Estados para actividad reciente
  const [actividadReciente, setActividadReciente] = useState<ActividadVenta[]>([]);

  // Estados para los gráficos
  const [datosGraficoSemanal, setDatosGraficoSemanal] = useState<Array<{ label: string, ventas: number }>>([]);

  // Estado para el modal de mayorista
  const [modalMayoristaAbierto, setModalMayoristaAbierto] = useState(false);
  const [clientePreseleccionado, setClientePreseleccionado] = useState<Cliente | null>(null);

  // Estados para top clientes
  const [topClientes, setTopClientes] = useState<ClienteMetrica[]>([]);
  const [topClientesPorCompras, setTopClientesPorCompras] = useState<ClienteMetrica[]>([]);
  const [modoVisualizacion, setModoVisualizacion] = useState<'monto' | 'cantidad'>('monto');

  // Función para abrir modal con cliente preseleccionado
  const abrirModalConCliente = (cliente: ClienteMetrica) => {
    const clienteFormateado = {
      idCliente: cliente.id,
      nombreCliente: cliente.nombre,
      numeroDocumento: cliente.documento,
      tipoCliente: cliente.tipoCliente || 'Cliente'
    };
    setClientePreseleccionado(clienteFormateado);
    setModalMayoristaAbierto(true);
  };

  // Calcular métricas a partir de los datos de ventas
  const calcularMetricas = useCallback((ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setMetricasVenta({ totalVentas: 0, productosVendidos: 0, clientesNuevos: 0, ticketPromedio: 0 });
      return;
    }

    const totalVentas = ventasData.reduce((sum, venta) => sum + (venta.totalVentas ?? 0), 0);
    const productosVendidos = ventasData.reduce((sum, venta) => {
      if (venta.detalles && venta.detalles.length > 0) {
        return sum + venta.detalles.reduce((detSum, detalle) => detSum + detalle.cantidad, 0);
      }
      return sum;
    }, 0);
    const ticketPromedio = ventasData.length > 0 ? totalVentas / ventasData.length : 0;
    const clientesUnicos = new Set(
      ventasData.map(venta => venta.cliente?.idCliente).filter(id => id !== undefined)
    ).size;

    setMetricasVenta({ totalVentas, productosVendidos, clientesNuevos: clientesUnicos, ticketPromedio });
  }, []);

  const procesarDatosGraficoSemanal = useCallback((ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setDatosGraficoSemanal(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(l => ({ label: l, ventas: 0 })));
      return;
    }

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
  }, []);

  const generarActividadReciente = useCallback((ventas: Venta[]) => {
    const ventasRecientes: ActividadVenta[] = [...ventas]
      .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
      .slice(0, 10)
      .map(venta => ({
        id: venta.idVenta || 0,
        tipo: 'venta',
        titulo: 'Venta Registrada',
        detalle: `Venta #${venta.idVenta}`,
        monto: venta.totalVentas ?? 0,
        fecha: new Date(venta.fechaVenta).toLocaleDateString(),
        usuario: venta.usuario?.usuario ?? 'Sistema',
        cliente: venta.cliente?.nombreCliente || 'Cliente General'
      }));
    setActividadReciente(ventasRecientes);
  }, []);

  const calcularTopClientes = useCallback((ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientes([]);
      return;
    }
    const clientesMap = new Map<number, { nombre: string, documento: string, tipoCliente: string, totalCompras: number }>();
    ventasData.forEach(venta => {
      if (venta.cliente?.idCliente) {
        const clienteId = venta.cliente.idCliente;
        const totalVenta = venta.totalVentas ?? 0;
        if (clientesMap.has(clienteId)) {
          clientesMap.get(clienteId)!.totalCompras += totalVenta;
        } else {
          clientesMap.set(clienteId, {
            nombre: venta.cliente.nombreCliente,
            documento: venta.cliente.numeroDocumento || clienteId.toString(),
            tipoCliente: venta.cliente.tipoCliente || 'Cliente',
            totalCompras: totalVenta
          });
        }
      }
    });
    setTopClientes(Array.from(clientesMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => (b.totalCompras || 0) - (a.totalCompras || 0)).slice(0, 10));
  }, []);

  const calcularTopClientesPorCantidad = useCallback((ventasData: Venta[]) => {
    if (!ventasData || ventasData.length === 0) {
      setTopClientesPorCompras([]);
      return;
    }
    const clientesMap = new Map<number, { nombre: string, documento: string, tipoCliente: string, cantidadCompras: number }>();
    ventasData.forEach(venta => {
      if (venta.cliente?.idCliente) {
        const clienteId = venta.cliente.idCliente;
        if (clientesMap.has(clienteId)) {
          clientesMap.get(clienteId)!.cantidadCompras += 1;
        } else {
          clientesMap.set(clienteId, {
            nombre: venta.cliente.nombreCliente,
            documento: venta.cliente.numeroDocumento || clienteId.toString(),
            tipoCliente: venta.cliente.tipoCliente || 'Cliente',
            cantidadCompras: 1
          });
        }
      }
    });
    setTopClientesPorCompras(Array.from(clientesMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => (b.cantidadCompras || 0) - (a.cantidadCompras || 0)).slice(0, 10));
  }, []);

  const cargarDatos = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    setCargando(true);
    setErrorSync(null);
    try {
      const [todasVentas, usuariosResp] = await Promise.all([
        VentaService.obtenerTodasVentas(),
        UsuarioService.obtenerUsuariosConRoles()
      ]);

      const ventasData = Array.isArray(todasVentas) ? todasVentas : [];
      
      // Filtrar por semana por defecto para métricas principales
      const ahora = new Date();
      const hace7Dias = new Date();
      hace7Dias.setDate(ahora.getDate() - 7);
      const ventasSemana = ventasData.filter(v => new Date(v.fechaVenta) >= hace7Dias);

      setUsuarios(Array.isArray(usuariosResp) ? (usuariosResp as Array<{
        id: number;
        usuario: string;
        activo?: boolean;
        roles?: string[];
      }>).map(u => ({
        id: u.id,
        usuario: u.usuario,
        activo: u.activo ?? true,
        roles: Array.isArray(u.roles) ? u.roles.map((r: string) => ({ nombreRol: r as RolNombre })) : []
      })) : []);

      calcularMetricas(ventasSemana);
      procesarDatosGraficoSemanal(ventasData);
      generarActividadReciente(ventasData);
      calcularTopClientes(ventasData);
      calcularTopClientesPorCantidad(ventasData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setErrorSync('Error al sincronizar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [isReady, isAuthenticated, calcularMetricas, procesarDatosGraficoSemanal, generarActividadReciente, calcularTopClientes, calcularTopClientesPorCantidad]);

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) navigate('/login');
      else cargarDatos();
    }
  }, [isReady, isAuthenticated, navigate, cargarDatos]);

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ value: number, payload: { label: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl">
          <p className="text-white text-[10px] font-black uppercase tracking-widest mb-1">{payload[0].payload.label}</p>
          <p className="text-indigo-400 text-sm font-black">
            {formatearMoneda(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (authLoading || !isReady) return <AuthLoadingScreen message="Cargando panel de administración..." />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="mx-auto max-w-[1600px] space-y-10">
        
        {/* Cabecera Premium */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="space-y-1 text-left">
            <h1 className="text-3xl font-black tracking-tighter text-black">
              Hola, {usuario?.usuario?.split(' ')[0] || 'Administrador'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-sm font-medium text-gray-500">
                Visualización estratégica y gestión del sistema en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {errorSync && (
              <span className="text-xs font-bold text-rose-500 px-3 py-1 bg-rose-50 rounded-lg animate-pulse">
                {errorSync}
              </span>
            )}
            <button 
              onClick={cargarDatos}
              disabled={cargando}
              className="h-12 px-6 bg-white border border-[#E5E7EB] rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              <span>{cargando ? 'Sincronizando' : 'Actualizar'}</span>
            </button>

            <button 
              onClick={() => navigate(APP_PATHS.caja)}
              className="h-12 px-6 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
            >
              <LayoutDashboard size={14} />
              <span>Ver Ventas</span>
            </button>
          </div>
        </header>

        {/* Tarjetas métricas - Estilo Dark Premium */}
        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Ventas Totales', val: formatearMoneda(metricasVenta.totalVentas), sub: 'Últimos 7 días', icon: DollarSign, col: 'bg-emerald-500/20', iconCol: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.2)' },
            { label: 'Productos Vendidos', val: metricasVenta.productosVendidos, sub: 'Artículos entregados', icon: Package, col: 'bg-indigo-500/20', iconCol: 'text-indigo-400', glow: 'rgba(99, 102, 241, 0.2)' },
            { label: 'Clientes Nuevos', val: metricasVenta.clientesNuevos, sub: 'Base de datos', icon: Users, col: 'bg-violet-500/20', iconCol: 'text-violet-400', glow: 'rgba(168, 85, 247, 0.2)' },
            { label: 'Ticket Promedio', val: formatearMoneda(metricasVenta.ticketPromedio), sub: 'Por transacción', icon: TrendingUp, col: 'bg-amber-500/20', iconCol: 'text-amber-400', glow: 'rgba(245, 158, 11, 0.2)' }
          ].map((m, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-[2.5rem] bg-[#0D0D0D] border border-[#1F1F1F] p-8 transition-all hover:-translate-y-2 text-left"
              style={{ boxShadow: `inset 1px 1px 0px 0px ${m.glow}, 0 25px 50px -12px rgba(0, 0, 0, 0.5)` }}
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.02] blur-3xl group-hover:scale-150 transition-transform" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${m.col} border border-white/5 shadow-inner`}>
                    <m.icon size={28} className={m.iconCol} strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-1">{m.label}</p>
                    <p className="text-3xl font-black tabular-nums text-[#F8FAFC] leading-none">{m.val}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm font-bold text-[#9CA3AF] opacity-60 tracking-tight">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Layout Analítico */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* Gráfico de Ventas */}
            {cargando ? (
              <ChartSkeleton />
            ) : (
            <div className="flex flex-col rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] transition-all text-left" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-black">Ventas por Día</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rendimiento Semanal</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Esta Semana</span>
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGraficoSemanal}>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar 
                      dataKey="ventas" 
                      fill="#6366f1" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            )}

            {/* Gestión de Clientes */}
            <div className="rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] text-left transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-black">Gestión de Clientes</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {modoVisualizacion === 'monto' ? 'Top 10 por Facturación' : 'Top 10 por Volumen'}
                  </p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setModoVisualizacion('monto')}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${modoVisualizacion === 'monto' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                  >
                    Monto
                  </button>
                  <button 
                    onClick={() => setModoVisualizacion('cantidad')}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${modoVisualizacion === 'cantidad' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                  >
                    Cantidad
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(modoVisualizacion === 'monto' ? topClientes : topClientesPorCompras).map((cliente, idx) => (
                  <div key={cliente.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' : 
                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-black">{cliente.nombre}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{cliente.tipoCliente} • {cliente.documento}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-black text-black">
                          {modoVisualizacion === 'monto' ? formatearMoneda(cliente.totalCompras || 0) : `${cliente.cantidadCompras} ventas`}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rendimiento</p>
                      </div>
                      <button 
                        onClick={() => abrirModalConCliente(cliente)}
                        className="h-9 w-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            
            {/* Estadísticas de Usuarios */}
            <div className="rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] text-left transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-black">Personal</h3>
                <span className="h-5 px-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full flex items-center uppercase">
                  {usuarios.length} Total
                </span>
              </div>

              <div className="space-y-6">
                {[
                  { rol: 'ROLE_ADMIN', label: 'Administradores', col: 'bg-amber-500' },
                  { rol: 'ROLE_ALMACENERO', label: 'Almaceneros', col: 'bg-indigo-500' },
                  { rol: 'ROLE_CAJERO', label: 'Cajeros', col: 'bg-violet-500' }
                ].map(r => {
                  const count = usuarios.filter(u => u.roles && u.roles.some(role => role.nombreRol === r.rol)).length;
                  const pct = usuarios.length > 0 ? (count / usuarios.length) * 100 : 0;
                  return (
                    <div key={r.rol} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{r.label}</span>
                        <span className="text-xs font-black text-black">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div className={`h-full ${r.col} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-black text-black">{usuarios.filter(u => u.activo).length}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-black">{usuarios.filter(u => !u.activo).length}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Inactivos</p>
                </div>
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] text-left flex flex-col transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-black">Actividad</h3>
                <History size={16} className="text-gray-400" />
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {actividadReciente.map((act, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-white border border-gray-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <CreditCard size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-gray-900 truncate uppercase">{act.cliente}</p>
                        <p className="text-[9px] font-bold text-gray-400">{act.fecha} • {formatearMoneda(act.monto)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="rounded-[2.5rem] bg-black p-8 text-white shadow-2xl relative overflow-hidden group text-left">
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-lg font-black mb-1 relative z-10 uppercase tracking-tighter">Acciones</h3>
              <p className="text-[10px] font-bold text-gray-500 mb-8 relative z-10 uppercase tracking-widest">Centro de Control Admin</p>

              <div className="space-y-3 relative z-10">
                <button
                  onClick={() => navigate(APP_PATHS.gestionUsuarios)}
                  className="w-full h-14 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-3"
                >
                  Gestión Usuarios
                  <UserPlus size={16} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setClientePreseleccionado(null); setModalMayoristaAbierto(true); }}
                    className="h-12 bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                  >
                    Nuevo Mayorista
                  </button>
                  <button
                    onClick={() => navigate(APP_PATHS.reportes)}
                    className="h-12 bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                  >
                    Reportes
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ModalHacerMayorista 
        isOpen={modalMayoristaAbierto}
        onClose={() => setModalMayoristaAbierto(false)}
        clientePreseleccionado={clientePreseleccionado}
        onSuccess={() => {
          setModalMayoristaAbierto(false);
          cargarDatos();
        }}
      />
    </div>
  );
};

export default DashboardAdminPage;
