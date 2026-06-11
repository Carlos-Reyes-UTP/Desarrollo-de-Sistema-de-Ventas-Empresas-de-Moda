import React, { useState, useEffect } from 'react';
import { MaterialIcon, SectionHeader, TableSkeleton } from '@/shared/ui';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ProductoService } from '@/services/ProductoService';
import { ProductoVarianteService } from '@/services/ProductoVarianteService';
import { ReporteService } from '@/services/ReporteService';
import { useAuth } from '@/context/AuthContext';
import type { Producto } from '@/types/Producto';
import type { ProductoVariante } from '@/types/ProductoVariante';
import type { PrediccionIARequest } from '@/types/ReporteVentas';
import * as XLSX from 'xlsx';

const PrediccionVentas: React.FC = () => {
  const { usuario } = useAuth();
  const rolPrincipal = usuario?.roles?.[0]?.nombreRol || '';

  const [subTabActiva, setSubTabActiva] = useState<'stock' | 'demanda'>('stock');

  // Sección 1: Stock General
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [errorStock, setErrorStock] = useState<string | null>(null);
  const [filtroStock, setFiltroStock] = useState<'todos' | 'sobreestock' | 'normal' | 'bajo'>('todos');
  const [paginaActual, setPaginaActual] = useState<number>(1);

  // Sección 2: Predicción de Demanda
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);
  const [errorVariantes, setErrorVariantes] = useState<string | null>(null);
  const [stockSeguridad, setStockSeguridad] = useState<number>(0);
  const [predicciones, setPredicciones] = useState<Record<string, number>>({});
  const [statusIA, setStatusIA] = useState<string>('Esperando IA');
  const [procesandoIA, setProcesandoIA] = useState<boolean>(false);

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (subTabActiva === 'stock') {
      const fetchProductosYVariantes = async () => {
        try {
          setCargandoStock(true);
          setErrorStock(null);
          
          // Fetch products and variants concurrently
          const [productosData, variantesData] = await Promise.all([
            ProductoService.getAllProductos(rolPrincipal),
            ProductoVarianteService.obtenerTodasLasVariantes(rolPrincipal, true),
          ]);
          
          // Map variants to their product to compute the sum of variant stocks
          const stockMap = new Map<number, number>();
          variantesData.forEach((v) => {
            const pId = v.producto?.idProducto;
            if (pId !== undefined) {
              stockMap.set(pId, (stockMap.get(pId) || 0) + v.cantidad);
            }
          });

          // Create products with mapped stock
          const productsWithStock = productosData.map((p) => {
            const calculatedStock = p.idProducto !== undefined && stockMap.has(p.idProducto)
              ? (stockMap.get(p.idProducto) ?? 0)
              : p.cantidad;
            return {
              ...p,
              cantidad: calculatedStock // Sum of variant stocks, or base quantity if no variants
            };
          });

          // Sort products by ID
          const sorted = [...productsWithStock].sort((a, b) => (a.idProducto || 0) - (b.idProducto || 0));
          setProductos(sorted);
          setPaginaActual(1); // Reset page on fetch
        } catch (err: any) {
          console.error('Error al obtener productos y variantes:', err);
          setErrorStock('No se pudieron cargar los datos de inventario.');
        } finally {
          setCargandoStock(false);
        }
      };
      fetchProductosYVariantes();
    } else {
      const fetchVariantes = async () => {
        try {
          setCargandoVariantes(true);
          setErrorVariantes(null);
          const data = await ProductoVarianteService.obtenerTodasLasVariantes(rolPrincipal, true);
          // Mostrar máximo 7 productos (variantes)
          setVariantes(data.slice(0, 7));
        } catch (err: any) {
          console.error('Error al obtener variantes:', err);
          setErrorVariantes('No se pudieron cargar las variantes de los productos.');
        } finally {
          setCargandoVariantes(false);
        }
      };
      fetchVariantes();
    }
  }, [subTabActiva, rolPrincipal]);



  // Generar sugerencias llamando al microservicio de IA por lote
  const handleGenerarSugerencias = async () => {
    try {
      setProcesandoIA(true);
      setStatusIA('Procesando...');
      setPredicciones({});

      // Construir la lista de solicitudes a enviar a la IA
      const requests: PrediccionIARequest[] = variantes.map((v, i) => ({
        id_producto: v.producto?.idProducto || 1,
        color: v.color?.nombre || 'BLANCO',
        talla: v.talla?.nombreTalla || 'M',
        semana_ano: 11, // semana de año según el caso de uso
        es_campana: 1,  // valor campana según el caso de uso
        ventas_semana_pasada: Math.max(5, v.cantidad + 12 - i), // valor dinámico simulado sobre su stock
      }));

      const response = await ReporteService.predecirLote(requests);

      if (response && response.resultados) {
        const nuevasPredicciones: Record<string, number> = {};
        response.resultados.forEach((res) => {
          // Buscar la variante correspondiente por idProducto e identificación de variante
          const variant = variantes.find(
            (v) =>
              v.producto?.idProducto === res.id_producto &&
              `${v.color.nombre}-${v.talla.nombreTalla}` === res.variante
          );
          if (variant) {
            const key = variant.idProductoVariante ?? variant.idVariante ?? 0;
            nuevasPredicciones[key] = res.prediccion_ventas;
          }
        });
        setPredicciones(nuevasPredicciones);
        setStatusIA('success');
      } else {
        setStatusIA('Error en la predicción');
      }
    } catch (err: any) {
      console.error('Error al consultar lote en la IA:', err);
      setStatusIA('Error de Conexión');
    } finally {
      setProcesandoIA(false);
    }
  };

  // Exportar la tabla de predicciones a Excel
  const handleExportarExcel = () => {
    if (variantes.length === 0) return;

    const dataToExport = variantes.map((v, index) => {
      const key = v.idProductoVariante ?? v.idVariante ?? index;
      const pred = predicciones[key];
      const aComprar = pred !== undefined ? Math.max(0, pred + stockSeguridad - v.cantidad) : '---';

      return {
        Producto: v.producto?.nombre || 'Desconocido',
        Variante: `${v.color?.nombre || 'N/A'}-${v.talla?.nombreTalla || 'N/A'}`,
        'Stock Actual': v.cantidad,
        'Predicción IA': pred !== undefined ? pred : '---',
        'Stock Seguridad': stockSeguridad,
        'Cantidad a Comprar': aComprar,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyecciones de Compra');
    XLSX.writeFile(workbook, 'Proyecciones_Demanda_IA.xlsx');
  };

  // Preparar datos filtrados y paginados
  const countTodos = productos.length;
  const countSobreestock = productos.filter(p => p.cantidad > 180).length;
  const countNormal = productos.filter(p => p.cantidad >= 30 && p.cantidad <= 180).length;
  const countBajo = productos.filter(p => p.cantidad < 30).length;

  const productosFiltrados = productos.filter((p) => {
    if (filtroStock === 'sobreestock') return p.cantidad > 180;
    if (filtroStock === 'normal') return p.cantidad >= 30 && p.cantidad <= 180;
    if (filtroStock === 'bajo') return p.cantidad < 30;
    return true;
  });

  const elementosPorPagina = 8;
  const totalPaginas = Math.ceil(productosFiltrados.length / elementosPorPagina);
  const indexInicio = (paginaActual - 1) * elementosPorPagina;
  const productosPaginados = productosFiltrados.slice(indexInicio, indexInicio + elementosPorPagina);

  return (
    <div className="space-y-6 w-full animate-in">
      {/* Header Panel */}
      <DashboardPanel className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] flex items-center justify-center shrink-0">
            <MaterialIcon icon="insights" className="h-5 w-5 text-[var(--app-accent)]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-accent)]">Módulo de Reportes</p>
            <h2 className="text-2xl font-black app-heading">INVENTARIO Y DEMANDA</h2>
            <p className="text-sm app-text-muted mt-1">
              Monitoreo del stock físico de productos y predicción de demanda de productos mediante Inteligencia Artificial.
            </p>
          </div>
        </div>
      </DashboardPanel>

      {/* Sub-tab selector */}
      <div className="flex gap-2 p-1.5 bg-[var(--app-bg-muted)] border border-[var(--app-border)] rounded-2xl">
        <button
          type="button"
          onClick={() => setSubTabActiva('stock')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
            subTabActiva === 'stock'
              ? 'bg-[var(--app-accent)] text-white shadow-md font-bold'
              : 'app-text-muted hover:bg-[var(--app-bg-hover)]'
          }`}
        >
          <MaterialIcon icon="inventory_2" className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">1. Stock General</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTabActiva('demanda')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
            subTabActiva === 'demanda'
              ? 'bg-[var(--app-accent)] text-white shadow-md font-bold'
              : 'app-text-muted hover:bg-[var(--app-bg-hover)]'
          }`}
        >
          <MaterialIcon icon="psychology" className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">2. Predicción de Demanda</span>
        </button>
      </div>

      {/* Tab Content */}
      {subTabActiva === 'stock' ? (
        <DashboardPanel className="p-5 sm:p-6">
          <SectionHeader
            title="Stock General de Productos"
            subtitle="Niveles de stock consolidado para todos los productos base en el catálogo general"
          />

          {/* Barra de Filtros */}
          <div className="flex flex-wrap gap-2 mb-6 mt-4">
            <button
              type="button"
              onClick={() => {
                setFiltroStock('todos');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                filtroStock === 'todos'
                  ? 'bg-[var(--app-accent)] text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
              }`}
            >
              Todos
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filtroStock === 'todos' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
              }`}>
                {countTodos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('sobreestock');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                filtroStock === 'sobreestock'
                  ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
              }`}
            >
              Sobreestock ({'>'}180)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filtroStock === 'sobreestock' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
              }`}>
                {countSobreestock}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('normal');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                filtroStock === 'normal'
                  ? 'bg-blue-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
              }`}
            >
              Stock Normal (30-180)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filtroStock === 'normal' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
              }`}>
                {countNormal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroStock('bajo');
                setPaginaActual(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                filtroStock === 'bajo'
                  ? 'bg-red-600 text-white border-transparent shadow-sm'
                  : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-bg-hover)]'
              }`}
            >
              Bajo Stock ({'<'}30)
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filtroStock === 'bajo' ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
              }`}>
                {countBajo}
              </span>
            </button>
          </div>

          {cargandoStock ? (
            <div className="py-12">
              <TableSkeleton rows={8} columns={5} />
            </div>
          ) : errorStock ? (
            <div className="py-8 text-center text-red-500 font-medium">
              {errorStock}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-8 text-center app-text-muted">
              No se encontraron productos que coincidan con el filtro.
            </div>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--app-border)]">
                <table className="min-w-full divide-y divide-[var(--app-border)] bg-[var(--app-bg)]">
                  <thead className="bg-[var(--app-bg-muted)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider w-20">ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Nombre Producto</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Código</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {productosPaginados.map((prod, index) => {
                      const maxStockRef = Math.max(1, ...productosFiltrados.map(p => p.cantidad), 200);
                      const percentage = Math.min(100, Math.max(0, (prod.cantidad / maxStockRef) * 100));

                      let stockBadgeClass = "text-[var(--app-text)]";
                      let barColorClass = "bg-blue-500";
                      if (prod.cantidad > 180) {
                        stockBadgeClass = "text-emerald-600 dark:text-emerald-400";
                        barColorClass = "bg-emerald-500";
                      } else if (prod.cantidad < 30) {
                        stockBadgeClass = "text-red-600 dark:text-red-400";
                        barColorClass = "bg-red-500";
                      } else {
                        stockBadgeClass = "text-blue-600 dark:text-blue-400";
                        barColorClass = "bg-blue-500";
                      }

                      return (
                        <tr
                          key={prod.idProducto || index}
                          className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono app-text-muted">
                            #{prod.idProducto}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold app-heading text-sm">{prod.nombre}</div>
                            <div className="text-[11px] app-text-muted">{prod.tipoPublico}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono app-text-muted">
                            {prod.codigoIdentificacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--app-bg-muted)] app-text-muted border border-[var(--app-border)]">
                              {prod.categoriaPadre?.nombre || prod.subCategoria2?.nombre || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className={`font-black text-sm tabular-nums w-12 text-right ${stockBadgeClass}`}>
                                {prod.cantidad}
                              </span>
                              <div className="w-24 bg-[var(--app-bg-muted)] h-2 rounded-full overflow-hidden border border-[var(--app-border)]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--app-border)] pt-4">
                  <p className="text-xs app-text-muted">
                    Mostrando <span className="font-bold text-[var(--app-text)]">{indexInicio + 1}</span> a{' '}
                    <span className="font-bold text-[var(--app-text)]">
                      {Math.min(indexInicio + elementosPorPagina, productosFiltrados.length)}
                    </span>{' '}
                    de <span className="font-bold text-[var(--app-text)]">{productosFiltrados.length}</span> productos
                  </p>

                  <div className="flex items-center gap-1 bg-[var(--app-bg-muted)] p-1 rounded-xl border border-[var(--app-border)]">
                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                      disabled={paginaActual === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <MaterialIcon icon="chevron_left" className="w-4 h-4" />
                      Ant.
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pag) => {
                        const shouldShow =
                          totalPaginas <= 7 ||
                          pag === 1 ||
                          pag === totalPaginas ||
                          Math.abs(pag - paginaActual) <= 1;

                        if (!shouldShow) {
                          const showEllipsis =
                            (pag === 2 && paginaActual > 3) ||
                            (pag === totalPaginas - 1 && paginaActual < totalPaginas - 2);
                          return showEllipsis ? (
                            <span key={`el-${pag}`} className="px-2 text-xs font-mono text-[var(--app-text-muted)]">
                              ...
                            </span>
                          ) : null;
                        }

                        return (
                          <button
                            key={pag}
                            type="button"
                            onClick={() => setPaginaActual(pag)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              paginaActual === pag
                                ? 'bg-[var(--app-accent)] text-white'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)]'
                            }`}
                          >
                            {pag}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] hover:text-[var(--app-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      Sig.
                      <MaterialIcon icon="chevron_right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashboardPanel>
      ) : (
        <DashboardPanel className="p-5 sm:p-6">
          <SectionHeader
            title="Predicción de Demanda y Planificación de Compras"
            subtitle="Cálculo dinámico de stock de seguridad y generación de compras sugeridas con Inteligencia Artificial"
          />

          {cargandoVariantes ? (
            <div className="py-12">
              <TableSkeleton rows={7} columns={6} />
            </div>
          ) : errorVariantes ? (
            <div className="py-8 text-center text-red-500 font-medium">
              {errorVariantes}
            </div>
          ) : variantes.length === 0 ? (
            <div className="py-8 text-center app-text-muted">
              No hay variantes de productos registradas.
            </div>
          ) : (
            <div className="mt-5">
              <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)]">
                <table className="min-w-full divide-y divide-[var(--app-border)]">
                  <thead className="bg-[var(--app-bg-muted)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Variante</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Stock Actual</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>Predicción IA</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content">
                            Es la predicción de ventas para el siguiente mes y lo que se recomienda comprar.
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>Stock Seg.</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content">
                            Este stock sirve para subsanar o mitigar el posible margen de error del modelo de predicción.
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 reports-tooltip-trigger">
                          <span>A Comprar</span>
                          <MaterialIcon icon="help_outline" className="w-3.5 h-3.5 text-gray-400 hover:text-[var(--app-accent)]" />
                          <span className="reports-tooltip-content reports-tooltip-content--right">
                            Es el total que se recomienda comprar considerando el stock actual, más la predicción IA y el stock de seguridad.
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-bg)]">
                    {variantes.map((v, index) => {
                      const key = v.idProductoVariante ?? v.idVariante ?? index;
                      const pred = predicciones[key];
                      const aComprar = pred !== undefined ? Math.max(0, pred + stockSeguridad - v.cantidad) : null;

                      return (
                        <tr
                          key={key}
                          className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold app-heading text-sm">{v.producto?.nombre || 'Desconocido'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono app-heading">
                            {v.color?.nombre || 'N/A'}-{v.talla?.nombreTalla || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm app-text-muted font-bold tabular-nums">
                            {v.cantidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[var(--app-accent)] tabular-nums">
                            {pred !== undefined ? pred : '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm app-text-muted font-bold tabular-nums">
                            {stockSeguridad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {aComprar !== null ? aComprar : '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status and Controls Section */}
              <div className="mt-8 border-t border-[var(--app-border)] pt-6">
                <div className="text-center mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">Status</p>
                  <p className="text-lg font-mono font-bold mt-1 text-[var(--app-accent)]">{statusIA}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--app-text-muted)] whitespace-nowrap">
                      Ajuste Stock Seguridad
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={stockSeguridad}
                      onChange={(e) => setStockSeguridad(Number(e.target.value))}
                      className="w-32 sm:w-48 accent-[var(--app-accent)]"
                    />
                    <span className="flex items-center justify-center bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] text-xs font-black w-8 h-8 rounded-lg text-[var(--app-accent)]">
                      {stockSeguridad}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerarSugerencias}
                    disabled={procesandoIA || variantes.length === 0}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_85%,black)] text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[color-mix(in_srgb,var(--app-accent)_20%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <MaterialIcon icon="psychology" className="w-4 h-4" />
                    {procesandoIA ? 'Generando...' : 'Generar Sugerencias IA'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportarExcel}
                  disabled={variantes.length === 0}
                  className="w-full mt-4 py-3 rounded-2xl bg-[var(--app-bg-muted)] border border-[var(--app-border)] hover:bg-[var(--app-bg-hover)] text-[var(--app-text)] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <MaterialIcon icon="download" className="w-4 h-4" />
                  Exportar a Excel
                </button>
              </div>
            </div>
          )}
        </DashboardPanel>
      )}
    </div>
  );
};

export default PrediccionVentas;
