import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { DashboardMonthToggle } from '@/shared/ui/dashboard/DashboardMonthToggle';
import { DashboardSalesPaceChart } from '@/shared/ui/dashboard/DashboardSalesPaceChart';
import { DashboardRecentSalesTable } from '@/shared/ui/dashboard/DashboardRecentSalesTable';
import { DashboardVariantRankPanel } from '@/shared/ui/dashboard/DashboardVariantRankPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { UsuarioService } from '@/services/UsuarioService';
import { RUTAS_GERENTE_USUARIOS } from '@/config/apiConfig';
import type { Usuario } from '@/types/Usuario';
import type { RolNombre } from '@/types/enums';
import { contarPorRol, normalizarUsuario } from '@/utils/normalizarUsuario';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import { useDashboardVentasMes } from '@/hooks/useDashboardVentasMes';
import { deltaToneFromPct, formatDeltaPct } from '@/utils/dashboardMes';

const ROLES_DASHBOARD: Array<{ rol: RolNombre; label: string; varName: string }> = [
  { rol: 'ROLE_ADMIN', label: 'Administradores', varName: '--app-role-admin' },
  { rol: 'ROLE_GERENTE', label: 'Gerentes', varName: '--app-role-gerente' },
  { rol: 'ROLE_SUPERVISOR_ALMACEN', label: 'Supervisores', varName: '--app-role-supervisor' },
  { rol: 'ROLE_ALMACENERO', label: 'Almaceneros', varName: '--app-role-almacenero' },
  { rol: 'ROLE_CAJERO', label: 'Cajeros', varName: '--app-role-cajero' },
  { rol: 'ROLE_VENDEDOR', label: 'Vendedores', varName: '--app-role-vendedor' },
];

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const DashboardGerentePage = () => {
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
    etiquetaMesActual,
    etiquetaMesAnterior,
  } = useDashboardVentasMes(Boolean(isReady && isAuthenticated));

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const cargarPersonal = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    try {
      const usuariosResp = await UsuarioService.obtenerUsuariosConRoles(RUTAS_GERENTE_USUARIOS);
      setUsuarios(Array.isArray(usuariosResp) ? usuariosResp.map(normalizarUsuario) : []);
      setErrorUsuarios(null);
    } catch {
      setErrorUsuarios('No se pudo cargar el personal.');
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    void cargarPersonal();
  }, [cargarPersonal]);

  useAutoSync(
    () => {
      void reintentar();
      void cargarPersonal();
    },
    ['NUEVA_VENTA'],
    5000
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
          eyebrow="Panel de gerencia"
          title={`Hola, ${usuario?.usuario?.split(' ')[0] || 'Gerente'}`}
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
                  <MaterialIcon icon="bar_chart" className="w-3.5 h-3.5" />
                  Ver Reportes
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
                        <span className="text-xs font-black app-heading tabular-nums">{count}</span>
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
                className="w-full h-14 app-cta-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Gestionar Usuarios
                <MaterialIcon icon="manage_accounts" className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(APP_PATHS.gerentePisos)}
                  className="h-12 app-cta-btn-secondary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Pisos, áreas y ubicaciones
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
    </div>
  );
};

export default DashboardGerentePage;
