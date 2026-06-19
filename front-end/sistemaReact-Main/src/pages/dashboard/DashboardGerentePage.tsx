import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MaterialIcon } from '@/shared/ui';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAuth } from '@/context/AuthContext';
import {
  MetricCardsSkeleton,
  ChartSkeleton,
  PageHeader,
  PageActionButton,
  PageActionGroup,
  SectionHeader,
} from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DashboardCtaPanel } from '@/shared/ui/dashboard/DashboardCtaPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { UsuarioService } from '@/services/UsuarioService';
import { RUTAS_GERENTE_USUARIOS } from '@/config/apiConfig';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { Usuario } from '@/types/Usuario';
import type { RolNombre } from '@/types/enums';
import { contarPorRol, normalizarUsuario } from '@/utils/normalizarUsuario';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import {
  etiquetaPeriodo,
  filtrarVentasPorPeriodo,
  guardarPeriodo,
  inicioPeriodo,
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

const ROLES_DASHBOARD: Array<{ rol: RolNombre; label: string; varName: string }> = [
  { rol: 'ROLE_ADMIN', label: 'Administradores', varName: '--app-role-admin' },
  { rol: 'ROLE_GERENTE', label: 'Gerentes', varName: '--app-role-gerente' },
  { rol: 'ROLE_SUPERVISOR_ALMACEN', label: 'Supervisores', varName: '--app-role-supervisor' },
  { rol: 'ROLE_ALMACENERO', label: 'Almaceneros', varName: '--app-role-almacenero' },
  { rol: 'ROLE_CAJERO', label: 'Cajeros', varName: '--app-role-cajero' },
  { rol: 'ROLE_VENDEDOR', label: 'Vendedores', varName: '--app-role-vendedor' },
];

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
        <span className="font-semibold text-[10px] tracking-wider uppercase">
          {periodo === 'hoy' ? `Hora ${punto.label}` : punto.label}
        </span>
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="app-chart-tooltip-muted">Total:</span>
          <span className="font-bold app-chart-tooltip-accent">
            {formatterMonedaPE.format(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const DashboardGerentePage = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [errorSync, setErrorSync] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [metricasVenta, setMetricasVenta] = useState({
    totalVentas: 0,
    productosVendidos: 0,
    clientesNuevos: 0,
    ticketPromedio: 0,
  });
  const [datosGraficoSemanal, setDatosGraficoSemanal] = useState<Array<{ label: string; ventas: number }>>([]);
  const [periodo, setPeriodo] = useState<PeriodoDashboard>(() => leerPeriodoGuardado());
  const ventasDataRef = useRef<Venta[]>([]);
  const periodoRef = useRef<PeriodoDashboard>(periodo);

  useEffect(() => {
    periodoRef.current = periodo;
  }, [periodo]);

  const calcularMetricas = useCallback((ventasData: Venta[]) => {
    if (!ventasData?.length) {
      setMetricasVenta({ totalVentas: 0, productosVendidos: 0, clientesNuevos: 0, ticketPromedio: 0 });
      return;
    }
    const totalVentas = ventasData.reduce((sum, v) => sum + (v.totalVentas ?? 0), 0);
    const productosVendidos = ventasData.reduce((sum, v) => {
      if (v.detalles?.length) {
        return sum + v.detalles.reduce((d, det) => d + det.cantidad, 0);
      }
      return sum;
    }, 0);
    const ticketPromedio = ventasData.length > 0 ? totalVentas / ventasData.length : 0;
    const clientesUnicos = new Set(
      ventasData.map((v) => v.cliente?.idCliente).filter((id) => id !== undefined)
    ).size;
    setMetricasVenta({ totalVentas, productosVendidos, clientesNuevos: clientesUnicos, ticketPromedio });
  }, []);

  const aplicarPeriodoADatos = useCallback(
    (ventasData: Venta[], p: PeriodoDashboard) => {
      const ventasFiltradas = filtrarVentasPorPeriodo(ventasData, p);
      calcularMetricas(ventasFiltradas);
      setDatosGraficoSemanal(procesarDatosGraficoPorPeriodo(ventasFiltradas, p));
    },
    [calcularMetricas]
  );

  const cambiarPeriodo = useCallback(
    (p: PeriodoDashboard) => {
      guardarPeriodo(p);
      setPeriodo(p);
      aplicarPeriodoADatos(ventasDataRef.current, p);
    },
    [aplicarPeriodoADatos]
  );

  const cargarDatos = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    setCargando(true);
    setErrorSync(null);
    try {
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const fechaInicio = inicioPeriodo('30d');

      const [todasVentas, usuariosResp] = await Promise.all([
        VentaService.obtenerTodasVentas(fmt(fechaInicio), fmt(new Date())),
        UsuarioService.obtenerUsuariosConRoles(RUTAS_GERENTE_USUARIOS).catch(() => {
          setErrorUsuarios('No se pudo cargar el personal.');
          return [];
        }),
      ]);

      const ventasData = Array.isArray(todasVentas) ? todasVentas : [];
      ventasDataRef.current = ventasData;
      setUsuarios(Array.isArray(usuariosResp) ? usuariosResp.map(normalizarUsuario) : []);
      if (Array.isArray(usuariosResp)) setErrorUsuarios(null);

      aplicarPeriodoADatos(ventasData, periodoRef.current);
    } catch {
      setErrorSync('Error al sincronizar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [isReady, isAuthenticated, aplicarPeriodoADatos]);

  useAutoSync(cargarDatos, ['NUEVA_VENTA'], 5000);

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) navigate('/login');
      else cargarDatos();
    }
  }, [isReady, isAuthenticated, navigate, cargarDatos]);

  const formatearMoneda = (valor: number) => formatterMonedaPE.format(valor);
  const etiquetaPer = etiquetaPeriodo(periodo);
  const graficoVacioHoy = periodo === 'hoy' && datosGraficoSemanal.length === 0;
  const barSizeGrafico =
    datosGraficoSemanal.length <= 3 ? 72 : datosGraficoSemanal.length <= 6 ? 48 : 40;

  return (
    <div className="min-h-screen app-canvas p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <PageHeader
          variant="dashboard"
          surface="elevated"
          accent
          eyebrow="Panel de gerencia"
          title={`Hola, ${usuario?.usuario?.split(' ')[0] || 'Gerente'}`}
          actions={
            <PageActionGroup>
              <PageActionButton grouped onClick={() => navigate(`${APP_PATHS.reportes}?tab=ventas`)}>
                <MaterialIcon icon="bar_chart" className="w-3.5 h-3.5" />
                Ver Reportes
              </PageActionButton>
            </PageActionGroup>
          }
        />

        {errorSync && (
          <p className="text-xs font-bold text-rose-500 px-3 py-2 bg-rose-50 rounded-lg">{errorSync}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black app-text-faint uppercase tracking-widest">Período de métricas</p>
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

        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'Ventas Totales', val: formatearMoneda(metricasVenta.totalVentas), sub: etiquetaPer, icon: 'payments', index: 1 as const },
              { label: 'Productos Vendidos', val: metricasVenta.productosVendidos, sub: `Unidades en ${etiquetaPer.toLowerCase()}`, icon: 'checkroom', index: 2 as const },
              { label: 'Clientes Activos', val: metricasVenta.clientesNuevos, sub: `Con compra en ${etiquetaPer.toLowerCase()}`, icon: 'group', index: 3 as const },
              { label: 'Ticket Promedio', val: formatearMoneda(metricasVenta.ticketPromedio), sub: `Por transacción`, icon: 'trending_up', index: 4 as const },
            ].map((m, i) => (
              <DashboardMetricCard key={i} label={m.label} value={m.val} sub={m.sub} icon={m.icon} iconIndex={m.index} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            {cargando ? (
              <ChartSkeleton />
            ) : (
              <DashboardPanel>
                <SectionHeader title={tituloGraficoPeriodo(periodo)} />
                {subtituloGraficoPeriodo(periodo) && !graficoVacioHoy && (
                  <p className="text-[10px] font-bold app-text-muted -mt-4 mb-2">
                    {subtituloGraficoPeriodo(periodo)}
                  </p>
                )}
                <div className="h-[300px] w-full">
                  {graficoVacioHoy ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                      <MaterialIcon icon="schedule" className="w-10 h-10 app-text-faint" />
                      <p className="text-sm font-black app-heading">Aún no hay ventas hoy</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGraficoSemanal} margin={{ top: 10, right: 10, left: 4, bottom: 5 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={formatterEjeY} tick={{ fontSize: 10 }} width={48} />
                        <Tooltip content={<CustomTooltip periodo={periodo} />} cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Bar dataKey="ventas" fill="url(#colorGerenteSales)" radius={[6, 6, 0, 0]} barSize={barSizeGrafico} />
                        <defs>
                          <linearGradient id="colorGerenteSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0.35} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </DashboardPanel>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8">
            <DashboardPanel>
              <SectionHeader
                title="Personal"
                action={
                  <span className="h-5 px-2 bg-[var(--app-bg-muted)] text-[var(--app-accent)] border border-[var(--app-border)] text-[10px] font-black rounded-full flex items-center uppercase">
                    {usuarios.length} Total
                  </span>
                }
              />
              {errorUsuarios && (
                <p className="text-[10px] font-bold text-rose-500 mb-4">{errorUsuarios}</p>
              )}
              <div className="space-y-4">
                {ROLES_DASHBOARD.filter((r) => contarPorRol(usuarios, r.rol) > 0).map((r) => {
                  const count = contarPorRol(usuarios, r.rol);
                  const pct = usuarios.length > 0 ? (count / usuarios.length) * 100 : 0;
                  return (
                    <div key={r.rol} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">
                          {r.label}
                        </span>
                        <span className="text-xs font-black app-heading">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--app-bg-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: `var(${r.varName})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>

            <DashboardCtaPanel title="Acciones rápidas" subtitle="Configuración del sistema">
              <button
                type="button"
                onClick={() => navigate(APP_PATHS.gerenteUsuarios)}
                className="w-full h-14 app-cta-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
              >
                Gestionar Usuarios
                <MaterialIcon icon="manage_accounts" className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(APP_PATHS.gerentePisos)}
                  className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Pisos, áreas y ubicaciones
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
    </div>
  );
};

export default DashboardGerentePage;
