import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/shared/ui';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useGlobalWebSocket } from '@/context/WebSocketContext';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import ModalHacerMayorista from '@/components/mayoristas/ModalHacerMayorista';
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
import { DashboardMonthToggle } from '@/shared/ui/dashboard/DashboardMonthToggle';
import { DashboardSalesPaceChart } from '@/shared/ui/dashboard/DashboardSalesPaceChart';
import { DashboardRecentSalesTable } from '@/shared/ui/dashboard/DashboardRecentSalesTable';
import { DashboardVariantRankPanel } from '@/shared/ui/dashboard/DashboardVariantRankPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { AlmacenSolicitudesApi } from '@/services/almacenSolicitudesService';
import type { Cliente } from '@/types/Cliente';
import type { AlmacenSolicitud } from '@/types/AlmacenSolicitudes';
import {
  construirActividadDashboard,
  mergeActividadConEventosLive,
  type ActividadItem,
} from '@/utils/dashboardActividad';
import { useDashboardVentasMes } from '@/hooks/useDashboardVentasMes';
import { deltaToneFromPct, formatDeltaPct } from '@/utils/dashboardMes';

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const DashboardAdminPage = () => {
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const {
    modo,
    setModo,
    compareOn,
    cargando,
    error,
    reintentar,
    kpis,
    ritmo,
    rankings,
    recientes,
    ventas,
    etiquetaMesActual,
    etiquetaMesAnterior,
  } = useDashboardVentasMes(Boolean(isReady && isAuthenticated));

  const [actividadReciente, setActividadReciente] = useState<ActividadItem[]>([]);
  const { messages: wsMessages } = useGlobalWebSocket();
  const wsProcessedRef = useRef(0);
  const colaAlmacenRef = useRef<AlmacenSolicitud[]>([]);
  const ventasPoolRef = useRef(ventas);

  const [modalMayoristaAbierto, setModalMayoristaAbierto] = useState(false);
  const [clientePreseleccionado, setClientePreseleccionado] = useState<Cliente | null>(null);

  useEffect(() => {
    ventasPoolRef.current = ventas;
  }, [ventas]);

  const refrescarActividad = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    try {
      const cola = await AlmacenSolicitudesApi.cola().catch(() => []);
      colaAlmacenRef.current = cola;
      const base = construirActividadDashboard(ventasPoolRef.current, cola, '30d');
      setActividadReciente(mergeActividadConEventosLive(base, wsMessages));
    } catch {
      /* actividad es secundaria */
    }
  }, [isReady, isAuthenticated, wsMessages]);

  useEffect(() => {
    void refrescarActividad();
  }, [refrescarActividad, ventas]);

  useEffect(() => {
    if (wsMessages.length < wsProcessedRef.current) {
      wsProcessedRef.current = wsMessages.length;
      return;
    }
    if (wsMessages.length <= wsProcessedRef.current) return;
    wsProcessedRef.current = wsMessages.length;
    const base = construirActividadDashboard(ventasPoolRef.current, colaAlmacenRef.current, '30d');
    setActividadReciente(mergeActividadConEventosLive(base, wsMessages));
  }, [wsMessages]);

  useAutoSync(
    () => {
      void reintentar();
      void refrescarActividad();
    },
    ['NUEVA_VENTA', 'SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA'],
    2000
  );

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) navigate('/login');
    }
  }, [isReady, isAuthenticated, navigate]);

  const formatearMoneda = (valor: number) => formatterMonedaPE.format(valor);

  const deltaSub = (pct: number | null) => {
    const label = formatDeltaPct(pct, compareOn);
    if (!label) return compareOn ? '—' : null;
    return `${label} vs ${etiquetaMesAnterior}`;
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
          subtitle={`Resumen de ventas · ${etiquetaMesActual}`}
          actions={
            <>
              <DashboardMonthToggle
                value={modo}
                onChange={setModo}
                etiquetaMesActual={etiquetaMesActual}
                etiquetaMesAnterior={etiquetaMesAnterior}
              />
              <PageActionGroup>
                <PageActionButton grouped onClick={() => navigate(`${APP_PATHS.reportes}?tab=ventas`)}>
                  <MaterialIcon icon="speed" className="w-3.5 h-3.5" />
                  Ver Ventas
                </PageActionButton>
              </PageActionGroup>
            </>
          }
        />

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void reintentar()}
              className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardMetricCard
              label="Ventas totales"
              value={formatearMoneda(kpis.totalVentas)}
              sub={compareOn ? `vs ${etiquetaMesAnterior}` : etiquetaMesActual}
              icon="payments"
              iconIndex={1}
              deltaLabel={deltaSub(kpis.deltas?.totalVentas ?? null)}
              deltaTone={deltaToneFromPct(kpis.deltas?.totalVentas ?? null)}
            />
            <DashboardMetricCard
              label="Productos vendidos"
              value={kpis.productosVendidos}
              sub="Unidades del mes"
              icon="checkroom"
              iconIndex={2}
              deltaLabel={deltaSub(kpis.deltas?.productosVendidos ?? null)}
              deltaTone={deltaToneFromPct(kpis.deltas?.productosVendidos ?? null)}
            />
            <DashboardMetricCard
              label="Clientes activos"
              value={kpis.clientesActivos}
              sub="Con compra en el mes"
              icon="group"
              iconIndex={3}
              deltaLabel={deltaSub(kpis.deltas?.clientesActivos ?? null)}
              deltaTone={deltaToneFromPct(kpis.deltas?.clientesActivos ?? null)}
            />
            <DashboardMetricCard
              label="Ticket promedio"
              value={formatearMoneda(kpis.ticketPromedio)}
              sub="Por transacción"
              icon="trending_up"
              iconIndex={4}
              deltaLabel={deltaSub(kpis.deltas?.ticketPromedio ?? null)}
              deltaTone={deltaToneFromPct(kpis.deltas?.ticketPromedio ?? null)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8 order-1">
            {cargando ? <ChartSkeleton /> : <DashboardSalesPaceChart data={ritmo} compareOn={compareOn} />}
            <DashboardRecentSalesTable
              ventas={recientes}
              onVerHistorial={() => navigate(`${APP_PATHS.reportes}?tab=ventas`)}
            />
          </div>

          <div className="lg:col-span-4 space-y-8 order-2">
            <DashboardVariantRankPanel top={rankings.top} bottom={rankings.bottom} />

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
                className="w-full h-14 app-cta-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 mb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Gestión Usuarios
                <MaterialIcon icon="manage_accounts" className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setClientePreseleccionado(null);
                    setModalMayoristaAbierto(true);
                  }}
                  className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Nuevo Mayorista
                </button>
                <button
                  type="button"
                  onClick={() => navigate(APP_PATHS.reportes)}
                  className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
          void reintentar();
        }}
      />
    </div>
  );
};

export default DashboardAdminPage;
