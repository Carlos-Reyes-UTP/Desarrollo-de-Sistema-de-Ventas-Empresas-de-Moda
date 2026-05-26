import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MaterialIcon } from '@/shared/ui';
import { useAutoSync } from '@/hooks/useAutoSync';

import { scrollbarStyles } from '@/styles/scrollbarStyles';

import ModalHacerMayorista from '@/components/mayoristas/ModalHacerMayorista';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAuth } from '@/context/AuthContext';
import { MetricCardsSkeleton, ChartSkeleton, PageHeader, PageActionButton, PageActionGroup, SectionHeader } from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DashboardCtaPanel } from '@/shared/ui/dashboard/DashboardCtaPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { UsuarioService } from '@/services/UsuarioService';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { Usuario } from '@/types/Usuario';
import type { Cliente } from '@/types/Cliente';
import type { RolNombre } from '@/types/enums';


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

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ value: number, payload: { label: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-md p-3 rounded-xl border border-gray-150/60 dark:border-gray-800/80 shadow-xl shadow-slate-200/50 dark:shadow-black/50 min-w-[140px]">
        <div className="flex items-center space-x-1.5 pb-1.5 mb-1.5 border-b border-gray-100 dark:border-gray-800/60">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="font-semibold text-gray-800 dark:text-gray-200 text-[10px] tracking-wider uppercase">{payload[0].payload.label}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-gray-400 mr-3">Ventas:</span>
          <span className="font-bold text-indigo-650 dark:text-indigo-400">
            {formatterMonedaPE.format(payload[0].value)}
          </span>
        </div>
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
    const ventasRecientes: ActividadVenta[] = ventas
      .toSorted((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
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

  useAutoSync(cargarDatos, ['NUEVA_VENTA', 'SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA'], 2000);

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) navigate('/login');
      else cargarDatos();
    }
  }, [isReady, isAuthenticated, navigate, cargarDatos]);

  const formatearMoneda = (valor: number) => {
    return formatterMonedaPE.format(valor);
  };



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
                <PageActionButton grouped variant="secondary" onClick={cargarDatos} disabled={cargando}>
                  <MaterialIcon icon="sync" className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
                  {cargando ? 'Sincronizando' : 'Actualizar'}
                </PageActionButton>
                <PageActionButton grouped onClick={() => navigate(APP_PATHS.caja)}>
                  <MaterialIcon icon="speed" className="w-3.5 h-3.5" />
                  Ver Ventas
                </PageActionButton>
              </PageActionGroup>
            </>
          }
        />

        {/* Tarjetas métricas - Estilo Dark Premium */}
        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Ventas Totales', val: formatearMoneda(metricasVenta.totalVentas), sub: 'Últimos 7 días', icon: 'payments', index: 1 as 1 | 2 | 3 | 4 },
            { label: 'Productos Vendidos', val: metricasVenta.productosVendidos, sub: 'Artículos entregados', icon: 'checkroom', index: 2 as 1 | 2 | 3 | 4 },
            { label: 'Clientes Nuevos', val: metricasVenta.clientesNuevos, sub: 'Base de datos', icon: 'group', index: 3 as 1 | 2 | 3 | 4 },
            { label: 'Ticket Promedio', val: formatearMoneda(metricasVenta.ticketPromedio), sub: 'Por transacción', icon: 'trending_up', index: 4 as 1 | 2 | 3 | 4 }
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
                title="Ventas por Día"
                action={
                  <div className="flex items-center gap-2 text-[10px] font-black app-text-faint uppercase tracking-widest">
                    <MaterialIcon icon="calendar_today" className="w-3.5 h-3.5 app-text-faint" />
                    Esta Semana
                  </div>
                }
              />

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGraficoSemanal} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorWeeklySales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.35}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--app-text-muted)', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--app-bg-muted)' }} />
                    <Bar 
                      dataKey="ventas" 
                      fill="url(#colorWeeklySales)" 
                      radius={[8, 8, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
            
            {/* Estadísticas de Usuarios */}
            <DashboardPanel className="text-left transition-all">
              <SectionHeader
                title="Personal"
                action={
                  <span className="h-5 px-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full flex items-center uppercase">
                    {usuarios.length} Total
                  </span>
                }
              />

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
                        <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">{r.label}</span>
                        <span className="text-xs font-black app-heading">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--app-bg-muted)] rounded-full overflow-hidden">
                        <div className={`h-full ${r.col} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--app-border)] grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-black app-heading">{usuarios.filter(u => u.activo).length}</p>
                  <p className="text-[9px] font-bold app-text-muted uppercase tracking-widest">Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black app-heading">{usuarios.filter(u => !u.activo).length}</p>
                  <p className="text-[9px] font-bold app-text-muted uppercase tracking-widest">Inactivos</p>
                </div>
              </div>
            </DashboardPanel>

            {/* Actividad Reciente */}
            <DashboardPanel className="text-left flex flex-col transition-all">
              <SectionHeader title="Actividad" action={<MaterialIcon icon="insights" className="w-4 h-4 app-text-muted" />} />

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {actividadReciente.map((act, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <MaterialIcon icon="receipt_long" className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black app-heading truncate uppercase">{act.cliente}</p>
                        <p className="text-[9px] font-bold app-text-muted">{act.fecha} • {formatearMoneda(act.monto)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardCtaPanel title="Acciones" subtitle="Centro de Control Admin">
                <button
                  type="button"
                  onClick={() => navigate(APP_PATHS.gestionUsuarios)}
                  className="w-full h-14 app-cta-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
                >
                  Gestión Usuarios
                  <MaterialIcon icon="person_add" className="w-4 h-4" />
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
