import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/shared/ui';
import { useAutoSync } from '@/hooks/useAutoSync';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Label
} from 'recharts';
import { AlmacenSolicitudesApi } from '@/services/almacenSolicitudesService';
import type { AlmacenSolicitud } from '@/types/AlmacenSolicitudes';
import { useAccesoAreaAlmacen } from '@/hooks/useAccesoAreaAlmacen';
import { useAuth } from '@/context/AuthContext';
import { useAuthReady } from '@/hooks/useAuthReady';
import { MetricCardsSkeleton, ChartSkeleton, PageHeader, PageActionButton, PageActionGroup, SectionHeader } from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DashboardCtaPanel } from '@/shared/ui/dashboard/DashboardCtaPanel';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import {
  DashboardService,
  UMBRAL_CRITICO_INVENTARIO,
  clasificarEstadoStock,
} from '@/services/DashboardService';
import { playKioskChime } from '@/components/almacen-tablero/almacenTableroSound';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import { useAppTheme } from '@/context/AppThemeContext';
import type {
  ProductoStats,
  CategoriaDistribucion,
  EstadoInventario,
  ProductoInventario,
  AlertaReposicion
} from '@/types/DashboardStats';


// Paleta de colores Retail Fashion
const CATEGORY_COLORS = ['#1E293B', '#C084FC', '#FDBA74', '#6366f1', '#a855f7', '#64748b'];
const STATUS_COLORS = {
  normal: '#34D399',
  bajo: '#FBBF24',
  critico: '#FB7185',
  agotado: '#A8A29E'
};

const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ name: string, value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="app-chart-tooltip backdrop-blur-md p-3 rounded-xl min-w-[140px]">
        <div className="flex items-center space-x-1.5 pb-1.5 mb-1.5 border-b border-[var(--app-border)]">
          <span className="w-2 h-2 rounded-full bg-[var(--app-accent)] animate-pulse" />
          <span className="font-semibold text-[10px] tracking-wider uppercase">{payload[0].name}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="app-chart-tooltip-muted mr-3">Cantidad:</span>
          <span className="font-bold app-chart-tooltip-accent">
            {payload[0].value}{' '}
            <span className="text-[10px] font-medium app-chart-tooltip-muted uppercase ml-0.5">uds</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const DashboardAlmaceneroPage = () => {
  const { themeId } = useAppTheme();
  const { isReady, isAuthenticated } = useAuthReady();
  const { usuario, tieneRol } = useAuth();
  const puedeVerPisos = tieneRol('ROLE_ALMACENERO');
  const { acceso: accesoAreaAlmacen } = useAccesoAreaAlmacen(true);
  const sectorParaCola = undefined;
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
  const [alertasReposicion, setAlertasReposicion] = useState<AlertaReposicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  // Estados para la Cola de Pedidos (Operaciones)
  const [, setCards] = useState<AlmacenSolicitud[]>([]);
  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);

  // Helper para cola
  const esVenta = (c: AlmacenSolicitud) => c.tipoSolicitud === "VENTA";

  const cargarCola = useCallback(async () => {
    try {
      const data = await AlmacenSolicitudesApi.cola(sectorParaCola);
      // Sonido si hay nuevas ventas
      const ventaIds = new Set<number>();
      for (const c of data) {
        if (esVenta(c)) {
          ventaIds.add(c.idSolicitud);
        }
      }
      if (inicializadoRef.current) {
        const nuevos = [...ventaIds].filter(id => !prevVentaIdsRef.current.has(id));
        if (nuevos.length > 0) {
          void playKioskChime();
        }
      } else {
        inicializadoRef.current = true;
      }
      prevVentaIdsRef.current = ventaIds;
      setCards(data);
    } catch (e) {
      console.error("Error cargando cola:", e);
    }
  }, [sectorParaCola]);

  useEffect(() => {
    void cargarCola();
  }, [cargarCola]);

  // WS global: todos los clientes reciben el evento; cola y alertas se filtran en el servidor al recargar.
  useAutoSync(cargarCola, ['SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA', 'NUEVA_VENTA'], 800);

  // Cargar datos del dashboard solo cuando la autenticación esté lista  // ===== FUNCIONES DEFINIDAS ANTES DE LOS useEffect =====

  const userRoleAlmacenero = tieneRol('ROLE_SUPERVISOR_ALMACEN') ? 'ROLE_SUPERVISOR_ALMACEN' : 'ROLE_ALMACENERO';

  const cargarInventarioReciente = useCallback(async () => {
    try {
      console.log('Cargando inventario reciente...');
      const inventario = await DashboardService.obtenerProductosInventario(50, undefined, userRoleAlmacenero);
      console.log('Inventario cargado:', inventario.length, 'productos');
      setInventarioReciente(inventario);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setInventarioReciente([]); // Establecer array vacío en caso de error
    }
  }, [userRoleAlmacenero]);

  const cargarDatosDashboard = useCallback(async () => {
    setCargando(true);
    setErrorSync(null);

    try {
      console.log('Iniciando carga de datos del dashboard...');

      // Cargar todas las estadísticas en paralelo
      const [
        estadisticasProductos,
        distribucionCategorias,
        estadoInventarioData,
        inventario,
        alertasReposicionData,
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
        DashboardService.obtenerProductosInventario(20, undefined, userRoleAlmacenero).catch(err => {
          console.error('Error en productos del inventario:', err);
          return [];
        }),
        DashboardService.obtenerAlertasReposicion().catch(err => {
          console.error('Error en alertas de reposición:', err);
          return [];
        })
      ]);

      console.log('Datos cargados exitosamente:', {
        estadisticasProductos,
        distribucionCategorias,
        estadoInventarioData,
        inventario: inventario.length
      });

      setProductosData(estadisticasProductos);
      setCategoriaStats(distribucionCategorias);
      setEstadoInventario(estadoInventarioData);
      setInventarioReciente(inventario);
      setAlertasReposicion(alertasReposicionData);

      // Cargar inventario adicional para la tabla de búsqueda
      await cargarInventarioReciente();
    } catch (err: any) {
      console.error('Error general al cargar datos del dashboard:', err);
      setErrorSync('Error al cargar los datos del dashboard. Verifique su conexión e intente nuevamente.');
    } finally {
      setCargando(false);
    }
  }, [cargarInventarioReciente, userRoleAlmacenero]);

  // ===== useEffect HOOKS =====

  useEffect(() => {
    if (isReady) {
      if (isAuthenticated) {
        cargarDatosDashboard();
      } else {
        window.location.href = '/login';
      }
    }
  }, [isReady, isAuthenticated, cargarDatosDashboard]);

  /** Críticas en piso (misma fuente que reposición automática), no stock global del catálogo. */
  const alertasCriticasPiso = useMemo(
    () => alertasReposicion.filter(a => a.stockActual <= UMBRAL_CRITICO_INVENTARIO),
    [alertasReposicion]
  );

  const valorInventarioAlmacen = useMemo(() => {
    return inventarioReciente.reduce(
      (sum, item) => sum + item.stock * (item.precioUnitario ?? 0),
      0
    );
  }, [inventarioReciente]);

  const etiquetaLineaAlmacen =
    accesoAreaAlmacen?.etiquetaAreaAsignada?.trim() || 'tu línea asignada';

  // Tras eventos WS globales, el GET de alertas aplica el filtro del almacén asignado en el servidor.
  useAutoSync(cargarDatosDashboard, ['NUEVA_VENTA', 'SOLICITUD_CREADA', 'SOLICITUD_ATENDIDA', 'SOLICITUD_RECHAZADA', 'REPOSICION_AUTOMATICA'], 2000);

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, string> = {
      normal: "bg-emerald-50 text-emerald-600",
      bajo: "bg-amber-50 text-amber-600",
      critico: "bg-rose-50 text-rose-600",
      "sin-stock": "bg-slate-100 text-slate-500",
    };
    const labels: Record<string, string> = {
      normal: "Normal",
      bajo: "Bajo",
      critico: "Crítico",
      "sin-stock": "Sin Stock",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config[estado] || "bg-gray-100 text-gray-500"}`}>
        {labels[estado] || estado}
      </span>
    );
  };





  return (
    <div className="min-h-screen app-canvas p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <PageHeader
          variant="dashboard"
          surface="elevated"
          accent
          eyebrow="Panel de almacén"
          title={`Hola, ${usuario?.usuario?.split(' ')[0] || 'Almacenero'}`}
          actions={
            <>
              {errorSync && (
                <span className="text-xs font-bold text-rose-500 px-3 py-1 bg-rose-50 rounded-lg shrink-0">
                  {errorSync}
                </span>
              )}
              <PageActionGroup>
                <PageActionButton grouped onClick={() => navigate(`${APP_PATHS.productos}?openModal=true`)}>
                  <MaterialIcon icon="add_circle" className="w-3.5 h-3.5" />
                  Nuevo Producto
                </PageActionButton>
              </PageActionGroup>
            </>
          }
        />

        {/* Tarjetas métricas - DARK PREMIUM REDESIGN CON CONTRASTE ALTO */}
        {cargando ? (
          <MetricCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { 
              label: 'Total Productos', 
              val: productosData.total, 
              sub: `Línea ${etiquetaLineaAlmacen}`, 
              icon: 'checkroom', 
              index: 2 as 1 | 2 | 3 | 4 | 5 
            },
            { 
              label: 'Bajo stock', 
              val: productosData.bajoStock, 
              sub: productosData.bajoStock > 0 ? 'Reponer ahora' : 'Todo al día', 
              icon: productosData.bajoStock > 0 ? 'warning' : 'check_circle', 
              index: (productosData.bajoStock > 0 ? 4 : 1) as 1 | 2 | 3 | 4 | 5 
            },
            { 
              label: 'Categorías', 
              val: productosData.categorias, 
              sub: 'Divisiones activas', 
              icon: 'sell', 
              index: 3 as 1 | 2 | 3 | 4 | 5 
            },
            { 
              label: 'Sin stock', 
              val: productosData.sinStock, 
              sub: productosData.sinStock > 0 ? 'Artículos agotados' : 'Sin agotados', 
              icon: productosData.sinStock > 0 ? 'error' : 'check_circle', 
              index: (productosData.sinStock > 0 ? 5 : 1) as 1 | 2 | 3 | 4 | 5 
            }
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
            <div className="grid grid-cols-1 gap-8">
              {/* Distribución - Donut con métrica central y Leyenda Lateral */}
              {cargando ? (
                <ChartSkeleton />
              ) : (
              <DashboardPanel>
                <SectionHeader title="Distribución" />

                <div className="flex flex-col md:flex-row items-center gap-8 flex-1">
                  <div className="w-full md:w-1/2 h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart key={themeId}>
                        <Pie
                          data={categoriaStats}
                          cx="50%" cy="50%"
                          innerRadius={80} outerRadius={110}
                          paddingAngle={6}
                          cornerRadius={5}
                          dataKey="porcentaje"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        >
                          {categoriaStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                          <Label
                            width={30} position="center"
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            content={({ viewBox }: any) => {
                              if (!viewBox || viewBox.cx == null) return null;
                              const { cx, cy } = viewBox;
                              return (
                                <g>
                                  <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fill="var(--app-text)" fontSize={24} fontWeight={900}>
                                    {productosData.total >= 1000 ? `${(productosData.total / 1000).toFixed(1)}K` : productosData.total}
                                  </text>
                                  <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" fill="var(--app-text-muted)" fontSize={10} fontWeight={700}>
                                    Items
                                  </text>
                                </g>
                              );
                            }}
                          />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full md:w-1/2 grid grid-cols-1 gap-2 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                    {categoriaStats.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--app-bg-muted)] hover:bg-[var(--app-surface-elevated)] transition-all border border-transparent hover:border-[var(--app-border)]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          <span className="text-[11px] font-black app-text-muted uppercase truncate">{cat.nombre}</span>
                        </div>
                        <span className="text-xs font-black app-heading">{cat.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardPanel>
              )}

              {/* Estado - BARRA APILADA HORIZONTAL (Stacked Progress Bar) */}
              <DashboardPanel>
                <SectionHeader
                  title="Estado General"
                  action={
                    <span
                      className="text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest"
                      style={{ color: STATUS_COLORS.normal, backgroundColor: `${STATUS_COLORS.normal}15` }}
                    >
                      {estadoInventario.normal}% Saludable
                    </span>
                  }
                />

                <div className="space-y-12">
                  {/* Barra Apilada */}
                  <div className="relative">
                    <div className="h-10 w-full rounded-2xl flex overflow-hidden shadow-inner bg-[var(--app-bg-muted)]">
                      <div style={{ width: `${estadoInventario.normal}%`, backgroundColor: STATUS_COLORS.normal }} className="h-full transition-all duration-1000 relative group">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white" />
                      </div>
                      <div style={{ width: `${estadoInventario.bajo}%`, backgroundColor: STATUS_COLORS.bajo }} className="h-full transition-all duration-1000 relative group">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white" />
                      </div>
                      <div style={{ width: `${estadoInventario.critico}%`, backgroundColor: STATUS_COLORS.critico }} className="h-full transition-all duration-1000 relative group">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white" />
                      </div>
                      <div style={{ width: `${estadoInventario.sinStock}%`, backgroundColor: STATUS_COLORS.agotado }} className="h-full transition-all duration-1000 relative group">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white" />
                      </div>
                    </div>

                    {/* Leyenda Horizontal Debajo de la Barra */}
                    <div className="mt-6 flex flex-wrap gap-6 justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.normal }} />
                          <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">Normal</span>
                        </div>
                        <span className="text-xl font-black app-heading">{estadoInventario.normal}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.bajo }} />
                          <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">Bajo</span>
                        </div>
                        <span className="text-xl font-black app-heading">{estadoInventario.bajo}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.critico }} />
                          <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">Crítico</span>
                        </div>
                        <span className="text-xl font-black app-heading">{estadoInventario.critico}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.agotado }} />
                          <span className="text-[10px] font-black app-text-faint uppercase tracking-widest">Agotado</span>
                        </div>
                        <span className="text-xl font-black app-heading">{estadoInventario.sinStock}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Espacio extra para métrica valiosa */}
                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-[var(--app-border)]">
                    <div className="p-4 rounded-2xl bg-[var(--app-bg-muted)] border border-[var(--app-border)]">
                      <p className="text-[10px] font-black app-text-faint uppercase tracking-widest mb-1">Productos en línea</p>
                      <p className="text-2xl font-black app-heading">
                        {productosData.total}
                        <span className="text-xs app-text-muted font-bold uppercase ml-1">con stock</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--app-bg-muted)] border border-[var(--app-border)]">
                      <p className="text-[10px] font-black app-text-faint uppercase tracking-widest mb-1">Valor en almacén</p>
                      <p className="text-2xl font-black app-heading">
                        {valorInventarioAlmacen >= 1000
                          ? `S/ ${(valorInventarioAlmacen / 1000).toFixed(1)}K`
                          : `S/ ${valorInventarioAlmacen.toFixed(0)}`}
                      </p>
                    </div>
                  </div>
                </div>
              </DashboardPanel>
            </div>

            {/* Inventario Reciente */}
            <DashboardPanel className="text-left transition-all">
              <SectionHeader
                title="Inventario Reciente"
                subtitle="Stock en tu almacén (no incluye pisos de venta)"
              />
              <div className="space-y-3">
                {inventarioReciente.slice(-4).reverse().map((item) => (
                  <div key={item.idProducto} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--app-bg-muted)] border border-transparent hover:border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center app-text-faint">
                        <MaterialIcon icon="checkroom" className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black app-heading">{item.nombre}</p>
                        <p className="text-[10px] font-bold app-text-muted uppercase tracking-tight">{item.categoria}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p
                          className={`text-sm font-black ${
                            clasificarEstadoStock(item.stock) === 'critico' || clasificarEstadoStock(item.stock) === 'sin-stock'
                              ? 'text-rose-500'
                              : clasificarEstadoStock(item.stock) === 'bajo'
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                          }`}
                        >
                          {item.stock} uds
                        </p>
                        {getEstadoBadge(item.estado)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 gap-8" style={{ gridTemplateRows: '1fr auto' }}>
            {/* Alertas - Estilo Compacto de Notificaciones con Reposición */}
            <DashboardPanel className="text-left flex flex-col">
              <SectionHeader
                title="Alertas"
                action={
                  <div className="flex gap-1">
                    {alertasCriticasPiso.length > 0 && (
                      <span className="h-5 px-2 bg-rose-100 text-rose-600 text-[10px] font-black rounded-full flex items-center">
                        {alertasCriticasPiso.length} CRÍTICAS
                      </span>
                    )}
                    {alertasReposicion.length > 0 && (
                      <span className="h-5 px-2 bg-amber-100 text-amber-600 text-[10px] font-black rounded-full flex items-center">
                        {alertasReposicion.length} REPOSICIÓN
                      </span>
                    )}
                  </div>
                }
              />

              {/* Sección Críticas (existente) */}
              {alertasCriticasPiso.length > 0 && (
                <>
                  <p className="text-[9px] font-black app-text-faint uppercase tracking-widest mb-2">Stock Bajo en Pisos</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {alertasCriticasPiso.map(alerta => (
                      <div
                        key={`${alerta.idVariante}-${alerta.idUbicacionArea}`}
                        className="p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-rose-100 hover:bg-rose-50/30 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <MaterialIcon icon="warning" className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black app-heading truncate uppercase">{alerta.nombreProducto}</p>
                            <p className="text-[9px] font-bold app-text-muted">
                              {alerta.ubicacionPiso} · {alerta.stockActual} uds en piso
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`${APP_PATHS.productos}?tab=pisos&areaId=${alerta.idUbicacionArea}&varianteId=${alerta.idVariante}&productoId=${alerta.idProducto}&pisoNombre=${encodeURIComponent(alerta.ubicacionPiso)}`)}
                          className="h-8 px-3 app-btn-primary text-[9px] font-black uppercase rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Separador entre secciones si ambas existen */}
              {alertasCriticasPiso.length > 0 && alertasReposicion.length > 0 && (
                <hr className="border-[var(--app-border)] my-3" />
              )}

              {/* Sección Reposición Necesaria (nueva) */}
              {alertasReposicion.length > 0 && (
                <>
                  <p className="text-[9px] font-black app-text-faint uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <MaterialIcon icon="inventory_2" className="w-3 h-3" />
                    Reposición Necesaria
                    {accesoAreaAlmacen?.etiquetaAreaAsignada && (
                      <span className="normal-case tracking-normal font-bold text-amber-600/90">
                        · {accesoAreaAlmacen.etiquetaAreaAsignada}
                      </span>
                    )}
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {alertasReposicion.map(alerta => {
                      const key = `${alerta.idVariante}-${alerta.idUbicacionArea}`;
                      return (
                        <div key={key} className="p-3 rounded-2xl bg-[var(--app-bg-muted)] border border-transparent hover:border-amber-200 hover:bg-amber-50/20 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                              <MaterialIcon icon="inventory" className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black app-heading truncate uppercase">{alerta.nombreProducto}</p>
                              <p className="text-[9px] font-bold app-text-muted">
                                {alerta.talla} · {alerta.color} | {alerta.ubicacionPiso} / {alerta.area}
                              </p>
                              <p className="text-[9px] font-bold app-text-muted">
                                Actual: {alerta.stockActual} uds · Sugerido: +{alerta.cantidadSugerida} uds
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <button
                              onClick={() => navigate(`${APP_PATHS.almacenTablero}?varianteId=${alerta.idVariante}&ubicacionAreaId=${alerta.idUbicacionArea}`)}
                              className="h-8 px-3 app-btn-primary text-[9px] font-black uppercase rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <MaterialIcon icon="visibility" className="w-3.5 h-3.5 mr-1 -ml-0.5 inline-block align-middle" />
                              REVISAR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Empty State: solo cuando ambas listas están vacías */}
              {alertasCriticasPiso.length === 0 && alertasReposicion.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center flex-1">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                    <MaterialIcon icon="check_circle" className="w-7 h-7" />
                  </div>
                  <p className="text-[10px] font-black app-text-muted uppercase tracking-widest">Sin alertas</p>
                </div>
              )}
            </DashboardPanel>

            <DashboardCtaPanel title="Acciones Rápidas" subtitle="Centro de Control Operativo">
                {tieneRol('ROLE_SUPERVISOR_ALMACEN') ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate(`${APP_PATHS.productos}?tab=historial`)}
                      className="w-full h-14 app-cta-btn-primary rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
                    >
                      <MaterialIcon icon="history" className="w-5 h-5" />
                      Ver Historial de Traslados
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`${APP_PATHS.productos}?exportModal=true`)}
                      className="w-full h-14 app-cta-btn-primary rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
                    >
                      <MaterialIcon icon="download" className="w-5 h-5" />
                      Reporte Stock
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {puedeVerPisos && (
                      <button
                        type="button"
                        onClick={() => navigate(`${APP_PATHS.productos}?tab=pisos`)}
                        className="w-full h-14 app-cta-btn-primary rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
                      >
                        <MaterialIcon icon="arrow_right_alt" className="w-5 h-5" />
                        Nuevo Traslado
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(APP_PATHS.almacenTablero)}
                      className="w-full h-14 app-cta-btn-primary rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3"
                    >
                      <MaterialIcon icon="dashboard" className="w-5 h-5" />
                      Tablero de Solicitudes
                    </button>
                  </div>
                )}
            </DashboardCtaPanel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAlmaceneroPage;
