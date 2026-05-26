import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MaterialIcon } from '@/shared/ui';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useGlobalWebSocket } from '@/context/WebSocketContext';

import { scrollbarStyles } from '@/styles/scrollbarStyles';

import ModalHacerMayorista from '@/components/mayoristas/ModalHacerMayorista';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAuth } from '@/context/AuthContext';
import { MetricCardsSkeleton, ChartSkeleton, PageHeader, PageActionButton, PageActionGroup, SectionHeader } from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DashboardCtaPanel } from '@/shared/ui/dashboard/DashboardCtaPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { VentaService } from '@/services/VentaService';
import { AlmacenSolicitudesApi } from '@/services/AlmacenSolicitudesService';
import type { Venta } from '@/types/Venta';
import type { Cliente } from '@/types/Cliente';
import {
  construirActividadDashboard,
  mergeActividadConEventosLive,
  type ActividadItem,
} from '@/utils/dashboardActividad';
import type { AlmacenSolicitud } from '@/types/AlmacenSolicitudes';
import {
  etiquetaPeriodo,
  filtrarVentasPorPeriodo,
  guardarPeriodo,
  leerPeriodoGuardado,
  procesarDatosGraficoPorPeriodo,
  subtituloGraficoPeriodo,
  tituloGraficoPeriodo,
  type PeriodoDashboard,
  type PuntoGraficoDashboard,
} from '@/utils/dashboardPeriodo';

const PERIODOS: Array<{ id: PeriodoDashboard; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

interface ClienteMetrica {
  id: number;
  nombre: string;
  documento: string;
  tipoCliente: string;
  totalCompras?: number;
  cantidadCompras?: number;
}

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const formatterEjeY = (valor: number) => {
  if (valor >= 1000) {
    return `S/${(valor / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k`;
  }
  return `S/${valor.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
};

const CustomTooltip = ({
  active,
  payload,
  periodo,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: PuntoGraficoDashboard }>;
  periodo: PeriodoDashboard;
}) => {
  if (active && payload && payload.length) {
    const punto = payload[0].payload;
    return (
      <div className="app-chart-tooltip backdrop-blur-md p-3 rounded-xl min-w-[140px]">
        <div className="flex items-center space-x-1.5 pb-1.5 mb-1.5 border-b border-[var(--app-border)]">
          <span className="w-2 h-2 rounded-full bg-[var(--app-accent)] animate-pulse" />
          <span className="font-semibold text-[10px] tracking-wider uppercase">
            {periodo === 'hoy' ? `Hora ${punto.label}` : punto.label}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="app-chart-tooltip-muted mr-3">Total:</span>
          <span className="font-bold app-chart-tooltip-accent">
            {formatterMonedaPE.format(payload[0].value)}
          </span>
        </div>
        {periodo === 'hoy' && punto.cantidadVentas != null && punto.cantidadVentas > 0 && (
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="app-chart-tooltip-muted mr-3">Transacciones:</span>
            <span className="font-bold app-heading">{punto.cantidadVentas}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const DashboardAdminPage = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Estados para los datos
  const [cargando, setCargando] = useState(true);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  // Estados para métricas
  const [metricasVenta, setMetricasVenta] = useState({
    totalVentas: 0,
    productosVendidos: 0,
    clientesNuevos: 0,
    ticketPromedio: 0
  });

  const [actividadReciente, setActividadReciente] = useState<ActividadItem[]>([]);
  const { messages: wsMessages } = useGlobalWebSocket();
  const wsProcessedRef = useRef(0);

  // Estados para los gráficos
  const [datosGraficoSemanal, setDatosGraficoSemanal] = useState<Array<{ label: string, ventas: number }>>([]);

  // Estado para el modal de mayorista
  const [modalMayoristaAbierto, setModalMayoristaAbierto] = useState(false);
  const [clientePreseleccionado, setClientePreseleccionado] = useState<Cliente | null>(null);

  // Estados para top clientes
  const [topClientes, setTopClientes] = useState<ClienteMetrica[]>([]);
  const [topClientesPorCompras, setTopClientesPorCompras] = useState<ClienteMetrica[]>([]);
  const [modoVisualizacion, setModoVisualizacion] = useState<'monto' | 'cantidad'>('monto');
  const [periodo, setPeriodo] = useState<PeriodoDashboard>(() => leerPeriodoGuardado());
  const ventasDataRef = useRef<Venta[]>([]);
  const colaAlmacenRef = useRef<AlmacenSolicitud[]>([]);
  const periodoRef = useRef<PeriodoDashboard>(periodo);

  useEffect(() => {
    periodoRef.current = periodo;
  }, [periodo]);

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

  const aplicarPeriodoADatos = useCallback(
    (ventasData: Venta[], colaAlmacen: AlmacenSolicitud[], p: PeriodoDashboard, ws: unknown[]) => {
      const ventasFiltradas = filtrarVentasPorPeriodo(ventasData, p);
      calcularMetricas(ventasFiltradas);
      setDatosGraficoSemanal(procesarDatosGraficoPorPeriodo(ventasFiltradas, p));
      calcularTopClientes(ventasFiltradas);
      calcularTopClientesPorCantidad(ventasFiltradas);
      const actividadBase = construirActividadDashboard(ventasData, colaAlmacen, p);
      setActividadReciente(mergeActividadConEventosLive(actividadBase, ws));
    },
    [calcularMetricas, calcularTopClientes, calcularTopClientesPorCantidad]
  );

  const cambiarPeriodo = useCallback(
    (p: PeriodoDashboard) => {
      guardarPeriodo(p);
      setPeriodo(p);
      aplicarPeriodoADatos(ventasDataRef.current, colaAlmacenRef.current, p, wsMessages);
    },
    [aplicarPeriodoADatos, wsMessages]
  );

  const cargarDatos = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    setCargando(true);
    setErrorSync(null);
    try {
      const [todasVentas, colaAlmacen] = await Promise.all([
        VentaService.obtenerTodasVentas(),
        AlmacenSolicitudesApi.cola().catch(() => []),
      ]);

      const ventasData = Array.isArray(todasVentas) ? todasVentas : [];
      ventasDataRef.current = ventasData;
      colaAlmacenRef.current = colaAlmacen;

      aplicarPeriodoADatos(ventasData, colaAlmacen, periodoRef.current, wsMessages);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setErrorSync('Error al sincronizar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [isReady, isAuthenticated, aplicarPeriodoADatos, wsMessages]);

  useEffect(() => {
    if (wsMessages.length <= wsProcessedRef.current) return;
    wsProcessedRef.current = wsMessages.length;
    const sinLiveBase = construirActividadDashboard(
      ventasDataRef.current,
      colaAlmacenRef.current,
      periodoRef.current
    );
    setActividadReciente(mergeActividadConEventosLive(sinLiveBase, wsMessages));
  }, [wsMessages]);

  useAutoSync(cargarDatos, ['NUEVA_VENTA', 'SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA'], 2000);

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) navigate('/login');
      else cargarDatos();
    }
  }, [isReady, isAuthenticated, navigate, cargarDatos]);

  const formatearMoneda = (valor: number) => {
    return formatterMonedaPE.format(valor);
  };

  const etiquetaPer = etiquetaPeriodo(periodo);
  const subtituloGrafico = subtituloGraficoPeriodo(periodo);
  const graficoVacioHoy = periodo === 'hoy' && datosGraficoSemanal.length === 0;
  const barSizeGrafico =
    datosGraficoSemanal.length <= 3
      ? 72
      : datosGraficoSemanal.length <= 6
        ? 48
        : 40;

  return (
    <div className="min-h-screen app-canvas p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <PageHeader
          variant="dashboard"
          surface="elevated"
          accent
          eyebrow="Panel de administración"
          title={`Hola, ${usuario?.usuario?.split(' ')[0] || 'Administrador'}`}
          actions={
            <>
              {errorSync && (
                <span className="text-xs font-bold text-rose-500 px-3 py-1 bg-rose-50 rounded-lg shrink-0">
                  {errorSync}
                </span>
              )}
              <PageActionGroup>
                <PageActionButton grouped onClick={() => navigate(`${APP_PATHS.reportes}?tab=ventas`)}>
                  <MaterialIcon icon="speed" className="w-3.5 h-3.5" />
                  Ver Ventas
                </PageActionButton>
              </PageActionGroup>
            </>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black app-text-faint uppercase tracking-widest">
            Período de métricas
          </p>
          <div className="flex bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => cambiarPeriodo(p.id)}
                disabled={cargando}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                  periodo === p.id ? 'app-btn-primary shadow-sm' : 'app-text-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tarjetas métricas - Estilo Dark Premium */}
        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Ventas Totales', val: formatearMoneda(metricasVenta.totalVentas), sub: etiquetaPer, icon: 'payments', index: 1 as 1 | 2 | 3 | 4 },
            { label: 'Productos Vendidos', val: metricasVenta.productosVendidos, sub: `Unidades en ${etiquetaPer.toLowerCase()}`, icon: 'checkroom', index: 2 as 1 | 2 | 3 | 4 },
            { label: 'Clientes Activos', val: metricasVenta.clientesNuevos, sub: `Con compra en ${etiquetaPer.toLowerCase()}`, icon: 'group', index: 3 as 1 | 2 | 3 | 4 },
            { label: 'Ticket Promedio', val: formatearMoneda(metricasVenta.ticketPromedio), sub: `Por transacción (${etiquetaPer.toLowerCase()})`, icon: 'trending_up', index: 4 as 1 | 2 | 3 | 4 }
          ].map((m, i) => (
            <DashboardMetricCard
              key={i}
              label={m.label}
              value={m.val}
              sub={m.sub}
              icon={m.icon}
              iconIndex={m.index}
            />
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
            <DashboardPanel>
              <SectionHeader
                title={tituloGraficoPeriodo(periodo)}
                action={
                  <div className="flex items-center gap-2 text-[10px] font-black app-text-faint uppercase tracking-widest">
                    <MaterialIcon icon="calendar_today" className="w-3.5 h-3.5 app-text-faint" />
                    {etiquetaPer}
                  </div>
                }
              />

              {subtituloGrafico && !graficoVacioHoy && (
                <p className="text-[10px] font-bold app-text-muted -mt-4 mb-2">{subtituloGrafico}</p>
              )}

              <div className="h-[300px] w-full">
                {graficoVacioHoy ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                    <MaterialIcon icon="schedule" className="w-10 h-10 app-text-faint" />
                    <p className="text-sm font-black app-heading">Aún no hay ventas hoy</p>
                    <p className="text-[10px] font-bold app-text-muted max-w-xs">
                      Cuando se registren ventas, verás aquí cada hora del día con actividad.
                    </p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={datosGraficoSemanal}
                    margin={{ top: 10, right: 10, left: 4, bottom: 5 }}
                    barCategoryGap={periodo === 'hoy' ? '20%' : '10%'}
                  >
                    <defs>
                      <linearGradient id="colorWeeklySales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0.35}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--app-text-muted)', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={formatterEjeY}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tick={{ fill: 'var(--app-text-muted)', fontSize: 9, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip periodo={periodo} />} cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Bar 
                      dataKey="ventas" 
                      fill="url(#colorWeeklySales)" 
                      radius={[8, 8, 0, 0]} 
                      barSize={barSizeGrafico}
                      minPointSize={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </DashboardPanel>
            )}

            {/* Gestión de Clientes */}
            <DashboardPanel className="text-left transition-all">
              <SectionHeader
                title="Gestión de Clientes"
                action={
                  <div className="flex bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
                  <button 
                    onClick={() => setModoVisualizacion('monto')}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${modoVisualizacion === 'monto' ? 'app-btn-primary shadow-sm' : 'app-text-muted'}`}
                  >
                    Monto
                  </button>
                  <button 
                    onClick={() => setModoVisualizacion('cantidad')}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${modoVisualizacion === 'cantidad' ? 'app-btn-primary shadow-sm' : 'app-text-muted'}`}
                  >
                    Cantidad
                  </button>
                  </div>
                }
              />

              <div className="space-y-3">
                {(modoVisualizacion === 'monto' ? topClientes : topClientesPorCompras).length === 0 ? (
                  <p className="text-xs app-text-muted py-6 text-center">
                    Sin compras de clientes en {etiquetaPer.toLowerCase()}.
                  </p>
                ) : null}
                {(modoVisualizacion === 'monto' ? topClientes : topClientesPorCompras).map((cliente, idx) => (
                  <div key={cliente.id} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--app-bg-muted)] border border-transparent hover:border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' : 
                        idx === 1 ? 'bg-slate-200 text-slate-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black app-heading">{cliente.nombre}</p>
                        <p className="text-[10px] font-bold app-text-muted uppercase tracking-tight">{cliente.tipoCliente} • {cliente.documento}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-black app-heading">
                          {modoVisualizacion === 'monto' ? formatearMoneda(cliente.totalCompras || 0) : `${cliente.cantidadCompras} ventas`}
                        </p>
                        <p className="text-[9px] font-bold app-text-muted uppercase tracking-widest">Rendimiento</p>
                      </div>
                      <button 
                        onClick={() => abrirModalConCliente(cliente)}
                        className="h-9 w-9 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--app-accent)] hover:text-[var(--app-accent-fg)] hover:border-transparent"
                      >
                        <MaterialIcon icon="arrow_outward" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="lg:col-span-4 space-y-8">

            {/* Actividad Reciente */}
            <DashboardPanel className="text-left flex flex-col transition-all">
              <SectionHeader title="Actividad" action={<MaterialIcon icon="insights" className="w-4 h-4 app-text-muted" />} />

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {actividadReciente.length === 0 ? (
                  <p className="text-xs app-text-muted py-4 text-center">Sin actividad reciente</p>
                ) : (
                  actividadReciente.map((act) => (
                    <div
                      key={act.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        act.tipo === 'ultima_venta'
                          ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900'
                          : act.tipo === 'evento_live'
                            ? 'bg-amber-50/40 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'
                            : 'bg-gray-50 border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 dark:bg-gray-900/40'
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <MaterialIcon icon={act.icono} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black app-heading leading-tight">{act.titulo}</p>
                        <p className="text-[9px] font-bold app-text-muted mt-0.5 line-clamp-2">{act.detalle}</p>
                        {act.monto != null && act.monto > 0 && (
                          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {formatearMoneda(act.monto)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DashboardPanel>

            <DashboardCtaPanel title="Acciones" subtitle="Centro de Control Admin">
                <button
                  type="button"
                  onClick={() => navigate(APP_PATHS.gestionUsuarios)}
                  className="w-full h-14 app-cta-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 mb-3"
                >
                  Gestión Usuarios
                  <MaterialIcon icon="manage_accounts" className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setClientePreseleccionado(null); setModalMayoristaAbierto(true); }}
                    className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Nuevo Mayorista
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(APP_PATHS.reportes)}
                    className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Reportes
                  </button>
                </div>
            </DashboardCtaPanel>

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
