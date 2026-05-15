import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  PackageCheck,
  Bookmark,
  RefreshCw,
  PlusCircle,
  MoveRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, Label
} from 'recharts';
import { AlmacenSolicitudesApi } from '@/services/almacenSolicitudesService';
import type { AlmacenSolicitudCard } from '@/types/AlmacenCola';
import { useAuth } from '@/context/AuthContext';
import { useAuthReady } from '@/hooks/useAuthReady';
import { AuthLoadingScreen } from '@/shared/auth/AuthLoadingScreen';
import { APP_PATHS } from '@/shared/layout/navigationConfig';
import { DashboardService } from '@/services/DashboardService';
import { playKioskChime } from '@/components/almacen-tablero/almacenTableroSound';
import type {
  ProductoStats,
  CategoriaDistribucion,
  EstadoInventario,
  ProductoInventario
} from '@/types/DashboardStats';

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

// Paleta de colores Retail Fashion (Muted/Pastel) para gráficas
const CATEGORY_COLORS = ['#1E293B', '#C084FC', '#FDBA74', '#6366f1', '#a855f7', '#64748b'];
const STATUS_COLORS = {
  normal: '#34D399',
  bajo: '#FBBF24',
  critico: '#FB7185',
  agotado: '#A8A29E'
};

const DashboardAlmaceneroPage = () => {
  const { isReady, isAuthenticated, loading: authLoading } = useAuthReady();
  const { usuario } = useAuth();
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
  const [cargando, setCargando] = useState(true);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  // Estados para la Cola de Pedidos (Operaciones)
  const [, setCards] = useState<AlmacenSolicitudCard[]>([]);
  const prevVentaIdsRef = useRef<Set<number>>(new Set());
  const inicializadoRef = useRef(false);

  // Helper para cola
  const esVenta = (c: AlmacenSolicitudCard) => c.tipoSolicitud === "VENTA";

  const cargarCola = useCallback(async () => {
    try {
      const data = await AlmacenSolicitudesApi.cola();
      // Sonido si hay nuevas ventas
      const ventaIds = new Set(data.filter(esVenta).map(c => c.idSolicitud));
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
  }, []);

  useEffect(() => {
    cargarCola();
    const id = setInterval(cargarCola, 3000);
    return () => clearInterval(id);
  }, [cargarCola]);

  // Cargar datos del dashboard solo cuando la autenticación esté lista  // ===== FUNCIONES DEFINIDAS ANTES DE LOS useEffect =====

  const cargarInventarioReciente = useCallback(async () => {
    try {
      console.log('Cargando inventario reciente...');
      const inventario = await DashboardService.obtenerProductosInventario(50); // Cargar más productos para mejor búsqueda
      console.log('Inventario cargado:', inventario.length, 'productos');
      setInventarioReciente(inventario);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setInventarioReciente([]); // Establecer array vacío en caso de error
    }
  }, []);

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
        DashboardService.obtenerProductosInventario(20).catch(err => {
          console.error('Error en productos del inventario:', err);
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

      // Cargar inventario adicional para la tabla de búsqueda
      await cargarInventarioReciente();
    } catch (err: unknown) {
      console.error('Error general al cargar datos del dashboard:', err);
      setErrorSync('Error al cargar los datos del dashboard. Verifique su conexión e intente nuevamente.');
    } finally {
      setCargando(false);
    }
  }, [cargarInventarioReciente]);

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

  if (authLoading || !isReady) {
    return <AuthLoadingScreen message="Cargando panel de almacén..." />;
  }

  const actualizarDatos = async () => {
    await cargarDatosDashboard();
  };

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

  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ name: string, value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl">
          <p className="text-white text-[10px] font-black uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-indigo-400 text-sm font-black">
            {payload[0].value} <span className="text-white/40 font-bold text-[9px] uppercase ml-1">Unidades</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="mx-auto max-w-[1600px] space-y-10">
        {/* Cabecera Estilo Dakani Premium */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="space-y-1 text-left">
            <h1 className="text-3xl font-black tracking-tighter text-black">
              Hola, {usuario?.usuario?.split(' ')[0] || 'Almacenero'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-medium text-gray-500">
                Panel de control de inventario y métricas en tiempo real.
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
              onClick={actualizarDatos}
              disabled={cargando}
              className="h-12 px-6 bg-white border border-[#E5E7EB] rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-600 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
              <span>{cargando ? 'Sincronizando' : 'Actualizar'}</span>
            </button>

            <button 
              onClick={() => navigate(`${APP_PATHS.productos}?openModal=true`)}
              className="h-12 px-6 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
            >
              <PlusCircle size={14} />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </header>

        {/* Tarjetas métricas - DARK PREMIUM REDESIGN CON CONTRASTE ALTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Total Productos', val: productosData.total, icon: Package, col: 'bg-indigo-500/20', iconCol: 'text-indigo-400', glow: 'rgba(99, 102, 241, 0.2)' },
            { label: 'Bajo stock', val: productosData.bajoStock, sub: 'Reponer ahora', icon: AlertTriangle, col: 'bg-rose-500/20', iconCol: 'text-rose-400', glow: 'rgba(244, 63, 94, 0.2)' },
            { label: 'Categorías', val: productosData.categorias, icon: Bookmark, col: 'bg-violet-500/20', iconCol: 'text-violet-400', glow: 'rgba(168, 85, 247, 0.2)' },
            { label: 'Sin stock', val: productosData.sinStock, sub: 'Agotados', icon: PackageCheck, col: 'bg-amber-500/20', iconCol: 'text-amber-400', glow: 'rgba(245, 158, 11, 0.2)' }
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
                    <p className="text-4xl font-black tabular-nums text-[#F8FAFC] leading-none">{m.val}</p>
                  </div>
                </div>
                {m.sub && <p className="mt-6 text-sm font-bold text-[#9CA3AF] opacity-60 tracking-tight">{m.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Layout Analítico */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 gap-8">
              {/* Distribución - Donut con métrica central y Leyenda Lateral */}
              <div className="flex flex-col rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] transition-all text-left" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-black">Distribución</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Composición por Categoría</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 flex-1">
                  <div className="w-full md:w-1/2 h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriaStats}
                          cx="50%" cy="50%"
                          innerRadius={80} outerRadius={110}
                          paddingAngle={6}
                          dataKey="porcentaje"
                          stroke="none"
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
                                  <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fill="#000" fontSize={24} fontWeight={900}>
                                    {productosData.total >= 1000 ? `${(productosData.total / 1000).toFixed(1)}K` : productosData.total}
                                  </text>
                                  <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize={10} fontWeight={700}>
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
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          <span className="text-[11px] font-black text-gray-600 uppercase truncate">{cat.nombre}</span>
                        </div>
                        <span className="text-xs font-black text-black">{cat.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estado - BARRA APILADA HORIZONTAL (Stacked Progress Bar) */}
              <div className="flex flex-col rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] transition-all text-left" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-black">Estado General</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance de Inventario</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest" style={{ color: STATUS_COLORS.normal, backgroundColor: `${STATUS_COLORS.normal}15` }}>
                      {estadoInventario.normal}% Saludable
                    </span>
                  </div>
                </div>

                <div className="space-y-12">
                  {/* Barra Apilada */}
                  <div className="relative">
                    <div className="h-10 w-full bg-gray-100 rounded-2xl flex overflow-hidden shadow-inner">
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
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Normal</span>
                        </div>
                        <span className="text-xl font-black text-black">{estadoInventario.normal}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.bajo }} />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bajo</span>
                        </div>
                        <span className="text-xl font-black text-black">{estadoInventario.bajo}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.critico }} />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Crítico</span>
                        </div>
                        <span className="text-xl font-black text-black">{estadoInventario.critico}%</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.agotado }} />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agotado</span>
                        </div>
                        <span className="text-xl font-black text-black">{estadoInventario.sinStock}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Espacio extra para métrica valiosa */}
                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-gray-50">
                    <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#F1F5F9]">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rotación Promedio</p>
                      <p className="text-2xl font-black text-black">12.4 <span className="text-xs text-gray-400 font-bold uppercase ml-1">días</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#F1F5F9]">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Inventario</p>
                      <p className="text-2xl font-black text-black">S/ 42.5K</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventario Reciente */}
            <div className="rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] text-left transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-black">Inventario Reciente</h3>
                <button onClick={() => navigate(APP_PATHS.productos)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">Exportar todo</button>
              </div>
              <div className="space-y-3">
                {inventarioReciente.slice(-4).reverse().map((item) => (
                  <div key={item.idProducto} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-black">{item.nombre}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.categoria}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className={`text-sm font-black ${item.stock <= 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock} uds</p>
                        {getEstadoBadge(item.estado)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 h-full flex flex-col">
            {/* Alertas Críticas - Estilo Compacto de Notificaciones */}
            <div className="rounded-[2.5rem] bg-white p-8 border border-[#E5E7EB] text-left flex flex-col flex-1 transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-black">Alertas</h3>
                <span className="h-5 px-2 bg-rose-100 text-rose-600 text-[10px] font-black rounded-full flex items-center">
                  {inventarioReciente.filter(p => p.estado === 'critico').length} CRÍTICAS
                </span>
              </div>

              {inventarioReciente.filter(p => p.estado === 'critico').length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {inventarioReciente.filter(p => p.estado === 'critico').map(producto => (
                    <div key={producto.idProducto} className="p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-rose-100 hover:bg-rose-50/30 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertTriangle size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-900 truncate uppercase">{producto.nombre}</p>
                          <p className="text-[9px] font-bold text-gray-400">STOCK: {producto.stock} UDS</p>
                        </div>
                      </div>
                      <button onClick={() => navigate(`${APP_PATHS.productos}?id=${producto.idProducto}`)} className="h-8 px-3 bg-white border border-gray-200 text-[9px] font-black uppercase text-gray-600 rounded-xl hover:bg-black hover:text-white hover:border-black transition-all opacity-0 group-hover:opacity-100">
                        Ver
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center flex-1">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                    <PackageCheck size={28} />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin alertas críticas</p>
                </div>
              )}
            </div>

            {/* Panel de Acciones Rápidas Consolidated */}
            <div className="rounded-[2.5rem] bg-black p-8 text-white shadow-2xl relative overflow-hidden group text-left">
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-lg font-black mb-1 relative z-10 uppercase tracking-tighter">Acciones Rápidas</h3>
              <p className="text-[10px] font-bold text-gray-500 mb-8 relative z-10 uppercase tracking-widest">Centro de Control Operativo</p>

              <div className="space-y-3 relative z-10">
                <button
                  onClick={() => navigate(`${APP_PATHS.productos}?tab=pisos`)}
                  className="w-full h-14 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-3"
                >
                  Nuevo Traslado
                  <MoveRight size={16} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(`${APP_PATHS.productos}?openModal=true`)}
                    className="h-12 bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                  >
                    Nuevo Producto
                  </button>
                  <button
                    onClick={() => { }}
                    className="h-12 bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                  >
                    Reporte Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAlmaceneroPage;
