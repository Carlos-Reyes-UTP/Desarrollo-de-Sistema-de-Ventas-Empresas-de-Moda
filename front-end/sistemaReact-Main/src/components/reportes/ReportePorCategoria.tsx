import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  TableCellsIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import type { ReporteCategoriaData } from '../../types/ReporteVentas';
import { AlertModal, ChartSkeleton, Skeleton, PageActionButton, SectionHeader } from '@/shared/ui';
import { DatePickerPopover } from '@/components/reportes/shared/DatePickerPopover';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';
import { ReportViewPills } from '@/components/reportes/layout/ReportViewPills';
import { CATEGORY_CHART_SLICE_COLORS } from '@/components/reportes/layout/reportChartTheme';
import { CustomTooltipCategoria } from '@/components/reportes/layout/categoryChartTooltip';
import { ReportCategoryBarChart } from '@/components/reportes/layout/ReportCategoryBarChart';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { generarInsightCategoria } from '@/utils/reportInsights';

const VISTAS_CATEGORIA = [
  { id: 'resumen' as const, label: 'Resumen' },
  { id: 'barras' as const, label: 'Barras' },
];

// Tipos para el estado de navegación
interface Breadcrumb {
  id: number | null;
  nombre: string;
  nivel: 'padre' | 'subcategoria' | 'segunda-subcategoria';
}

const ReportePorCategoria: React.FC = () => {
  const INICIO_MES = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const HOY = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  
  const [fechaInicio, setFechaInicio] = useState<string>(INICIO_MES);
  const [fechaFin, setFechaFin] = useState<string>(HOY);
  const { setActions } = useReportPageActions();
  const [reportes, setReportes] = useState<ReporteCategoriaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaGrafico, setVistaGrafico] = useState<'resumen' | 'barras'>('resumen');
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });
  
  // Estados para la navegación drill-down
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, nombre: 'Categorías Principales', nivel: 'padre' }
  ]);
  const [nivelActual, setNivelActual] = useState<'padre' | 'subcategoria' | 'segunda-subcategoria'>('padre');
  const categoriaSeleccionadaRef = useRef<number | null>(null);
  const puedeDrillDown = nivelActual !== 'segunda-subcategoria';

  useEffect(() => {
    cargarReportes();
  }, [fechaInicio, fechaFin, nivelActual]);

  const aplicarFiltroRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    const hoy = new Date();
    const fechaFinStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    let fechaInicioStr = '';
    
    switch (tipo) {
      case 'hoy':
        fechaInicioStr = fechaFinStr;
        break;
      case 'semana':
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hoy.getDate() - 7);
        fechaInicioStr = `${hace7Dias.getFullYear()}-${String(hace7Dias.getMonth() + 1).padStart(2, '0')}-${String(hace7Dias.getDate()).padStart(2, '0')}`;
        break;
      case 'mes':
        const hace30Dias = new Date(hoy);
        hace30Dias.setDate(hoy.getDate() - 30);
        fechaInicioStr = `${hace30Dias.getFullYear()}-${String(hace30Dias.getMonth() + 1).padStart(2, '0')}-${String(hace30Dias.getDate()).padStart(2, '0')}`;
        break;
    }
    
    setFechaInicio(fechaInicioStr);
    setFechaFin(fechaFinStr);
  };

  const limpiarFiltros = () => {
    setFechaInicio(INICIO_MES);
    setFechaFin(HOY);
  };

  const parentNombre = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1]?.nombre : undefined;
  const insightCategoria = useMemo(
    () =>
      generarInsightCategoria(
        reportes.map((r) => ({ categoria: r.categoria, ingresosTotales: r.ingresosTotales })),
        parentNombre
      ),
    [reportes, parentNombre]
  );

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filtrosLocal = {
        fechaInicio: fechaInicio ? new Date(fechaInicio + 'T00:00:00').toISOString() : undefined,
        fechaFin: fechaFin ? new Date(fechaFin + 'T23:59:59').toISOString() : undefined,
      };
      
      let data: any[];
      
      switch (nivelActual) {
        case 'padre':
          console.log('🔍 Cargando categorías principales...');
          console.log('📡 Endpoint:', 'http://localhost:8080/api/admin/reportes/por-categoria');
          console.log('📊 Filtros enviados:', filtrosLocal);
          
          // Llamada al servicio
          data = await ReporteService.getReportePorCategoria(filtrosLocal);
          console.log('📈 Respuesta del backend:', data);
          
          if (data.length === 0) {
            console.warn('⚠️ El backend devolvió un array vacío.');
            console.warn('🔧 Verificar que existen productos con categoría padre configurada');
          }
          break;
        case 'subcategoria':
          if (categoriaSeleccionadaRef.current) {
            console.log(`🔍 Cargando subcategorías para la categoría ${categoriaSeleccionadaRef.current}...`);
            data = await ReporteService.getReportePorSubcategoria(categoriaSeleccionadaRef.current, filtrosLocal);
          } else {
            console.warn('⚠️ No hay categoría seleccionada para mostrar subcategorías');
            data = [];
          }
          break;
        case 'segunda-subcategoria':
          if (categoriaSeleccionadaRef.current) {
            console.log(`🔍 Cargando segunda subcategoría para la subcategoría ${categoriaSeleccionadaRef.current}...`);
            data = await ReporteService.getReportePorSegundaSubcategoria(categoriaSeleccionadaRef.current, filtrosLocal);
          } else {
            console.warn('⚠️ No hay subcategoría seleccionada para mostrar segunda subcategoría');
            data = [];
          }
          break;
        default:
          data = [];
      }
      
      console.log(`✅ Datos finales para nivel ${nivelActual}:`, data);
      console.log(`📋 Número de registros: ${data.length}`);
      
      // Los datos ya vienen en el formato correcto del backend
      setReportes(data);
    } catch (err: any) {
      console.error('❌ Error al cargar reportes:', err);
      console.error('❌ Detalles del error:', err.response?.data);
      console.error('❌ Status del error:', err.response?.status);
      console.error('❌ URL del error:', err.config?.url);
      setError((err instanceof Error ? err.message : String(err)) || 'Error al cargar el reporte por categoría');
      setReportes([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para navegar hacia adelante (drill-down)
  const navegarHacia = (categoria: ReporteCategoriaData) => {
    if (!categoria.idCategoria) {
      console.warn('⚠️ No se puede navegar: categoria sin ID');
      return;
    }
    
    console.log(`🎯 Navegando hacia ${categoria.categoria} (ID: ${categoria.idCategoria})`);
    
    const nuevoNivel: 'subcategoria' | 'segunda-subcategoria' = 
      nivelActual === 'padre' ? 'subcategoria' : 'segunda-subcategoria';
    
    const nuevoBreadcrumb: Breadcrumb = {
      id: categoria.idCategoria,
      nombre: categoria.categoria,
      nivel: nuevoNivel
    };
    
    setBreadcrumbs(prev => [...prev, nuevoBreadcrumb]);
    categoriaSeleccionadaRef.current = categoria.idCategoria;
    setNivelActual(nuevoNivel);
  };

  // Función para navegar hacia atrás
  const navegarAtras = (index: number) => {
    const nuevoBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(nuevoBreadcrumbs);
    
    console.log(`🔙 Navegando atrás al índice ${index}`);
    
    if (index === 0) {
      console.log('🏠 Volviendo a categorías principales');
      setNivelActual('padre');
      categoriaSeleccionadaRef.current = null;
    } else {
      const breadcrumbAnterior = nuevoBreadcrumbs[index];
      console.log(`📁 Navegando a ${breadcrumbAnterior.nombre} (Nivel: ${breadcrumbAnterior.nivel})`);
      categoriaSeleccionadaRef.current = breadcrumbAnterior.id;
      setNivelActual(breadcrumbAnterior.nivel);
    }
  };

  const exportarDatos = useCallback(async () => {
    if (reportes.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      // Mostrar indicador de carga
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      loadingToast.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generando reporte de categorías...</span>
      `;
      document.body.appendChild(loadingToast);

      // Preparar datos para Excel
      const datosExcel = reportes.map(reporte => ({
        'Categoría': reporte.categoria,
        'Cantidad Total Vendida': reporte.cantidadTotalVendida,
        'Ingresos Totales (S/)': reporte.ingresosTotales,
        'Producto Más Vendido': reporte.productoMasVendido?.nombre || 'No disponible',
        'Cantidad Producto Top': reporte.productoMasVendido?.cantidadVendida || 0,
        'Porcentaje de Ventas': `${((reporte.ingresosTotales / reportes.reduce((sum, r) => sum + r.ingresosTotales, 0)) * 100).toFixed(1)}%`
      }));

      // Crear libro de Excel
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Categoría');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 20 }, // Categoría
        { wch: 18 }, // Productos Vendidos
        { wch: 20 }, // Cantidad Total
        { wch: 18 }, // Ingresos
        { wch: 25 }, // Producto Más Vendido
        { wch: 18 }, // Cantidad Top
        { wch: 18 }  // Porcentaje
      ];
      ws['!cols'] = colWidths;

      // Generar nombre del archivo con fecha y nivel
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `reporte_${nivelActual}_${fechaActual}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);

      // Remover indicador de carga y mostrar éxito
      document.body.removeChild(loadingToast);
      
      const successToast = document.createElement('div');
      successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      successToast.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Reporte de categorías exportado exitosamente</span>
      `;
      document.body.appendChild(successToast);
      
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 3000);

    } catch (error) {
      console.error('Error al exportar datos:', error);
      setAlertModal({ open: true, message: 'Error al generar el reporte. Inténtalo nuevamente.', variant: 'error' });
    }
  }, [reportes, nivelActual]);

  useEffect(() => {
    setActions(
      <PageActionButton onClick={exportarDatos} disabled={loading || reportes.length === 0}>
        <ArrowDownTrayIcon className="h-4 w-4" />
        Exportar Excel
      </PageActionButton>
    );
  }, [setActions, exportarDatos, loading, reportes.length]);

  const totalIngresos = useMemo(
    () => reportes.reduce((sum, r) => sum + r.ingresosTotales, 0),
    [reportes]
  );

  const topCategoria = useMemo(() => {
    if (reportes.length === 0) return null;
    return [...reportes].sort((a, b) => b.ingresosTotales - a.ingresosTotales)[0];
  }, [reportes]);

  const bottomCategoria = useMemo(() => {
    if (reportes.length <= 1) return null;
    return [...reportes].sort((a, b) => a.ingresosTotales - b.ingresosTotales)[0];
  }, [reportes]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <TableCellsIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {insightCategoria ? (
        <ReportInsightBanner message={insightCategoria} headline="Mix por categoría" icon="category" />
      ) : null}

      <DashboardPanel className="!p-5 sm:!p-6 relative z-20">
        <h3 className="text-base font-black app-heading mb-4">Filtros de Búsqueda</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Fecha inicio */}
          <DatePickerPopover
            label="Fecha inicio"
            value={fechaInicio}
            onChange={setFechaInicio}
          />

          {/* Fecha fin */}
          <DatePickerPopover
            label="Fecha fin"
            value={fechaFin}
            onChange={setFechaFin}
            min={fechaInicio}
          />

          {/* Limpiar */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 invisible">
              _
            </label>
            <button
              onClick={(e) => { e.stopPropagation(); limpiarFiltros(); }}
              className="w-full inline-flex min-h-12 lg:h-12 items-center justify-center gap-2 px-6 lg:px-8 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 app-btn-primary shadow-sm"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mr-2">
            Filtros rápidos
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('hoy'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('semana'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Últimos 7 días
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('mes'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Últimos 30 días
          </button>
        </div>
      </DashboardPanel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <DashboardMetricCard
          label={nivelActual === 'padre' ? 'Categorías' : nivelActual === 'subcategoria' ? 'Subcategorías' : 'Líneas'}
          value={reportes.length}
          icon="category"
          iconIndex={1}
        />
        <DashboardMetricCard
          label="Unidades"
          value={reportes.reduce((sum, r) => sum + r.cantidadTotalVendida, 0)}
          icon="inventory_2"
          iconIndex={2}
        />
        <DashboardMetricCard
          label="Ingresos"
          value={`S/ ${totalIngresos.toLocaleString('es-PE')}`}
          icon="payments"
          iconIndex={3}
        />
      </div>

      <DashboardPanel className="p-5">
        <nav className="flex flex-wrap" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={`${breadcrumb.nivel}-${breadcrumb.id || 'root'}`} className="flex items-center">
                {index > 0 && <span className="app-text-faint mx-1">/</span>}
                <button
                  type="button"
                  onClick={() => navegarAtras(index)}
                  className={`text-xs font-bold uppercase tracking-wide transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'app-heading cursor-default'
                      : 'text-[var(--app-accent)] hover:underline'
                  }`}
                  disabled={index === breadcrumbs.length - 1}
                >
                  {breadcrumb.nombre}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <p className="text-[10px] font-bold app-text-muted mt-3">
          {nivelActual === 'padre' && 'Categorías principales'}
          {nivelActual === 'subcategoria' && 'Subcategorías — clic en una barra del gráfico para profundizar'}
          {nivelActual === 'segunda-subcategoria' && 'Segunda subcategoría'}
        </p>
      </DashboardPanel>

      <ReportViewPills options={VISTAS_CATEGORIA} value={vistaGrafico} onChange={setVistaGrafico} />

      {vistaGrafico === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna 1: Distribución en Donut */}
          <DashboardPanel className="flex flex-col justify-between">
            <div>
              <SectionHeader title="Distribución de Ventas" subtitle="Porcentaje de participación" />
              {reportes.length > 0 ? (
                <div className="h-64 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportes}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={3}
                        cornerRadius={4}
                        dataKey="ingresosTotales"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {reportes.map((_entry, index) => (
                          <Cell
                            key={`pie-cell-${index}`}
                            fill={CATEGORY_CHART_SLICE_COLORS[index % CATEGORY_CHART_SLICE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipCategoria />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center app-text-muted text-sm font-medium">
                  No hay datos disponibles
                </div>
              )}
            </div>

            {/* Leyenda personalizada debajo */}
            {reportes.length > 0 && (
              <div className="space-y-2 mt-4 max-h-36 overflow-y-auto custom-scrollbar">
                {reportes.slice(0, 5).map((reporte, index) => {
                  const pct = totalIngresos > 0 ? (reporte.ingresosTotales / totalIngresos) * 100 : 0;
                  return (
                    <div key={reporte.categoria} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              CATEGORY_CHART_SLICE_COLORS[index % CATEGORY_CHART_SLICE_COLORS.length],
                          }}
                        />
                        <span className="app-heading font-medium truncate">{reporte.categoria}</span>
                      </div>
                      <span className="app-heading font-bold ml-2 tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardPanel>

          <ReportCategoryBarChart
            layout="horizontal"
            variant="ranked"
            data={reportes}
            maxItems={6}
            height={320}
            title="Ingresos por Categoría"
            subtitle={
              puedeDrillDown
                ? 'Comparativo general · clic en barra para subcategorías'
                : 'Comparativo general de facturación'
            }
            drillDownEnabled={puedeDrillDown}
            onCategorySelect={puedeDrillDown ? navegarHacia : undefined}
          />

          {/* Columna 3: Lista Resumen con Mini Barras + Destacados */}
          <DashboardPanel className="flex flex-col justify-between">
            <div>
              <SectionHeader title="Rendimiento y Progreso" subtitle="Porcentaje e impacto en catálogo" />
              {reportes.length > 0 ? (
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {reportes.map((reporte, index) => {
                    const pct = totalIngresos > 0 ? (reporte.ingresosTotales / totalIngresos) * 100 : 0;
                    return (
                      <div key={reporte.categoria} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold app-heading">
                          <span className="truncate max-w-[150px]">{reporte.categoria}</span>
                          <span className="tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-[var(--app-bg-muted)] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                index === 0
                                  ? 'var(--app-accent)'
                                  : 'color-mix(in srgb, var(--app-text-faint) 22%, var(--app-bg-muted))',
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] app-text-muted">
                          <span>S/ {reporte.ingresosTotales.toLocaleString()}</span>
                          <span>{reporte.cantidadTotalVendida} uds</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center app-text-muted text-sm font-medium">
                  No hay datos disponibles
                </div>
              )}
            </div>

            {/* Mayor crecimiento / Mayor declive */}
            {reportes.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[var(--app-border)]">
                {topCategoria && (
                  <div className="report-day-callout report-day-callout--best">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[var(--app-metric-icon-1-fg)]">
                      Líder de ventas
                    </div>
                    <div className="text-sm font-black app-heading truncate mt-1" title={topCategoria.categoria}>
                      {topCategoria.categoria}
                    </div>
                    <div className="text-xs font-black tabular-nums text-[var(--app-metric-icon-1-fg)] mt-2">
                      S/ {topCategoria.ingresosTotales.toLocaleString('es-PE')}
                    </div>
                  </div>
                )}
                {bottomCategoria && (
                  <div className="report-day-callout report-day-callout--worst">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[var(--app-metric-icon-5-fg)]">
                      Menor rotación
                    </div>
                    <div className="text-sm font-black app-heading truncate mt-1" title={bottomCategoria.categoria}>
                      {bottomCategoria.categoria}
                    </div>
                    <div className="text-xs font-black tabular-nums text-[var(--app-metric-icon-5-fg)] mt-2">
                      S/ {bottomCategoria.ingresosTotales.toLocaleString('es-PE')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DashboardPanel>
        </div>
      )}

      {vistaGrafico === 'barras' && (
        <ReportCategoryBarChart
          layout="vertical"
          variant="gradient"
          data={reportes}
          height={384}
          title="Ingresos por categoría"
          drillDownEnabled={puedeDrillDown}
          onCategorySelect={puedeDrillDown ? navegarHacia : undefined}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

export default ReportePorCategoria;
