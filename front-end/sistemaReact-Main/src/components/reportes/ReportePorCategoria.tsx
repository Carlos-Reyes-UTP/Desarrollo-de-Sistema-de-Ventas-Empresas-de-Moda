import React, { useState, useEffect, useRef } from 'react';
import {
  TableCellsIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import type { ReporteCategoriaData, FiltrosReporte } from '../../types/ReporteVentas';
import { AlertModal, ChartSkeleton, TableSkeleton, Skeleton } from '@/shared/ui';

// Tipos para el estado de navegación
interface Breadcrumb {
  id: number | null;
  nombre: string;
  nivel: 'padre' | 'subcategoria' | 'segunda-subcategoria';
}

const ReportePorCategoria: React.FC = () => {
  const [reportes, setReportes] = useState<ReporteCategoriaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'pie' | 'tabla'>('barras');
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });
  
  // Estados para la navegación drill-down
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, nombre: 'Categorías Principales', nivel: 'padre' }
  ]);
  const [nivelActual, setNivelActual] = useState<'padre' | 'subcategoria' | 'segunda-subcategoria'>('padre');
  const categoriaSeleccionadaRef = useRef<number | null>(null);
  const [panelExpandido, setPanelExpandido] = useState(false);

  useEffect(() => {
    cargarReportes();
  }, [filtros, nivelActual]);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: any[];
      
      switch (nivelActual) {
        case 'padre':
          console.log('🔍 Cargando categorías principales...');
          console.log('📡 Endpoint:', 'http://localhost:8080/api/admin/reportes/por-categoria');
          console.log('📊 Filtros enviados:', filtros);
          
          // Llamada al servicio
          data = await ReporteService.getReportePorCategoria(filtros);
          console.log('📈 Respuesta del backend:', data);
          
          if (data.length === 0) {
            console.warn('⚠️ El backend devolvió un array vacío.');
            console.warn('🔧 Verificar que existen productos con categoría padre configurada');
          }
          break;
        case 'subcategoria':
          if (categoriaSeleccionadaRef.current) {
            console.log(`🔍 Cargando subcategorías para la categoría ${categoriaSeleccionadaRef.current}...`);
            data = await ReporteService.getReportePorSubcategoria(categoriaSeleccionadaRef.current, filtros);
          } else {
            console.warn('⚠️ No hay categoría seleccionada para mostrar subcategorías');
            data = [];
          }
          break;
        case 'segunda-subcategoria':
          if (categoriaSeleccionadaRef.current) {
            console.log(`🔍 Cargando segunda subcategoría para la subcategoría ${categoriaSeleccionadaRef.current}...`);
            data = await ReporteService.getReportePorSegundaSubcategoria(categoriaSeleccionadaRef.current, filtros);
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
      setError(err.message || 'Error al cargar el reporte por categoría');
      setReportes([]);
    } finally {
      setLoading(false);
    }
  };

  const coloresPie = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
    
    // Auto-expandir el panel cuando se navega a un nuevo nivel
    setPanelExpandido(true);
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
    
    // Auto-expandir el panel cuando se navega hacia atrás
    setPanelExpandido(true);
  };

  const exportarDatos = async () => {
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
        'Productos Vendidos': reporte.cantidadProductosVendidos,
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
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <ChartSkeleton />
        <TableSkeleton rows={8} columns={5} />
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

  const totalIngresos = reportes.reduce((sum, r) => sum + r.ingresosTotales, 0);

  return (
    <div className="p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ventas por Categoría</h2>
              <p className="text-gray-600 mt-1">
                Análisis de ventas segmentado por categorías de productos
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={exportarDatos}
                disabled={loading || reportes.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Breadcrumbs de navegación */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={`${breadcrumb.nivel}-${breadcrumb.id || 'root'}`} className="flex items-center">
                    {index > 0 && (
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-gray-400 mx-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                      </svg>
                    )}
                    <button
                      onClick={() => navegarAtras(index)}
                      className={`text-sm font-medium transition-colors ${
                        index === breadcrumbs.length - 1
                          ? 'text-gray-500 cursor-default'
                          : 'text-blue-600 hover:text-blue-800 hover:underline'
                      }`}
                      disabled={index === breadcrumbs.length - 1}
                    >
                      {breadcrumb.nombre}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {nivelActual === 'padre' && 'Mostrando categorías principales'}
                {nivelActual === 'subcategoria' && 'Mostrando subcategorías'}
                {nivelActual === 'segunda-subcategoria' && 'Mostrando segunda subcategoría'}
              </p>
              {breadcrumbs.length > 1 && (
                <div className="flex items-center space-x-2 text-xs text-blue-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Haz clic en cualquier nivel para navegar atrás</span>
                </div>
              )}
            </div>
          </div>

          {/* Resumen estadístico */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {nivelActual === 'padre' ? 'Categorías activas' : 
                     nivelActual === 'subcategoria' ? 'Subcategorías' : 'Segunda subcategoría'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportes.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <TableCellsIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total unidades</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportes.reduce((sum, r) => sum + r.cantidadTotalVendida, 0)}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    S/ {totalIngresos.toLocaleString()}
                  </p>
                </div>
                <div className="p-1 bg-purple-100 rounded-full">
                  <svg className="h-10 w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Productos vendidos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reportes.reduce((sum, r) => sum + r.cantidadProductosVendidos, 0)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de vista y visualización principal */}
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            {['barras', 'pie', 'tabla'].map((vista) => (
              <button
                key={vista}
                onClick={() => {
                  setVistaGrafico(vista as any);
                  // Ocultar panel expandible cuando se cambia a gráfico/torta
                  if (vista !== 'tabla') {
                    setPanelExpandido(false);
                  } else {
                    // Reactivar panel si vuelve a tabla y ya había navegado
                    if (breadcrumbs.length > 1) {
                      setPanelExpandido(true);
                    }
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  vistaGrafico === vista
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {vista === 'barras' ? 'Barras' : vista === 'pie' ? 'Torta' : 'Tabla'}
              </button>
            ))}
          </div>

          {/* Visualización de datos principal */}
          {vistaGrafico === 'barras' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Categoría</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`S/.${Number(value).toLocaleString()}`, 'Ingresos']} />
                    <Bar dataKey="ingresosTotales" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {vistaGrafico === 'pie' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Ingresos por Categoría</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={((props: any) => 
                        `${props.categoria}: S/ ${Number(props.ingresosTotales).toLocaleString()}`
                      ) as any}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="ingresosTotales"
                    >
                      {reportes.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={coloresPie[index % coloresPie.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`S/${Number(value).toLocaleString()}`, 'Ingresos']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {vistaGrafico === 'tabla' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {nivelActual === 'padre' ? 'Categoría Principal' : 
                         nivelActual === 'subcategoria' ? 'Subcategoría' : 'Segunda Subcategoría'}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Productos Vendidos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingresos Totales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto Más Vendido
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % del Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportes.map((reporte, index) => (
                      <tr key={`${reporte.idCategoria}-${reporte.categoria}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
                                 style={{ backgroundColor: coloresPie[index % coloresPie.length] + '20' }}>
                              <TableCellsIcon className="h-4 w-4" style={{ color: coloresPie[index % coloresPie.length] }} />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{reporte.categoria}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {reporte.cantidadProductosVendidos}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {reporte.cantidadTotalVendida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          S/.{reporte.ingresosTotales.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {reporte.productoMasVendido?.nombre || 'No disponible'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {reporte.productoMasVendido?.cantidadVendida || 0} unidades
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {((reporte.ingresosTotales / totalIngresos) * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {/* Solo mostrar botón de drill-down si no estamos en el último nivel */}
                          {nivelActual !== 'segunda-subcategoria' && reporte.idCategoria && (
                            <button
                              onClick={() => navegarHacia(reporte)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              title={`Ver ${nivelActual === 'padre' ? 'subcategorías' : 'segunda subcategoría'}`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {nivelActual === 'padre' ? 'Ver Subcategorías' : 'Ver Siguiente Nivel'}
                            </button>
                          )}
                          {nivelActual === 'segunda-subcategoria' && (
                            <span className="text-xs text-gray-400 italic">Último nivel</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mensaje cuando no hay datos */}
              {reportes.length === 0 && (
                <div className="text-center py-8">
                  <TableCellsIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {nivelActual === 'padre' ? 'No hay categorías principales con ventas' :
                     nivelActual === 'subcategoria' ? 'No hay subcategorías en esta categoría' :
                     'No hay segunda subcategoría en esta categoría'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Panel Expandible de Análisis Detallado - Solo se muestra en vista tabla cuando se navega */}
          {panelExpandido && breadcrumbs.length > 1 && vistaGrafico === 'tabla' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 overflow-hidden animate-slide-down">
              {/* Header del panel de análisis */}
              <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg w-fit">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900">
                      📊 Análisis Detallado: {breadcrumbs[breadcrumbs.length - 1].nombre}
                    </h3>
                  </div>
                  <button
                    onClick={() => setPanelExpandido(false)}
                    className="flex-shrink-0 p-2 hover:bg-blue-200 rounded-lg transition-colors"
                    title="Cerrar panel de análisis"
                  >
                    <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del panel de análisis reorganizado en 4 filas */}
              <div className="p-4 sm:p-6 bg-white space-y-6">
                
                {/* FILA 1: Gráfico de Barras Completo - Mismo estilo que el principal */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    📊 <span className="ml-2">Gráfico de Barras - Vista Detallada</span>
                  </h4>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoria" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`S/.${Number(value).toLocaleString()}`, 'Ingresos']} />
                        <Bar dataKey="ingresosTotales" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* FILA 2: Gráfico Circular */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    🍰 <span className="ml-2">Distribución Porcentual</span>
                  </h4>
                  <div className="h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportes}
                          cx="50%"
                          cy="50%"
                          outerRadius={window.innerWidth < 640 ? 80 : 120}
                          fill="#8884d8"
                          dataKey="ingresosTotales"
                          label={((props: any) => 
                            `${props.categoria}: ${props.value ? ((props.value / totalIngresos) * 100).toFixed(1) : '0'}%`
                          ) as any}
                          labelLine={false}
                        >
                          {reportes.map((_entry, index) => (
                            <Cell key={`analysis-cell-${index}`} fill={coloresPie[index % coloresPie.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`S/.${Number(value).toLocaleString()}`, 'Ingresos']} 
                          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* FILA 3: Métricas Clave - Eliminada la métrica de variación max/min */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    📈 <span className="ml-2">Métricas Clave</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {reportes.length}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-800 font-medium">
                        {nivelActual === 'subcategoria' ? 'Subcategorías' : 'Items'}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        S/ {totalIngresos.toLocaleString()}
                      </div>
                      <div className="text-xs sm:text-sm text-green-800 font-medium">Ingresos Totales</div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4 text-center sm:col-span-2 lg:col-span-1">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600">
                        {reportes.reduce((sum, r) => sum + r.cantidadTotalVendida, 0)}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-800 font-medium">Unidades Vendidas</div>
                    </div>
                  </div>
                </div>

                {/* FILA 4: Resumen de Elementos */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    📋 <span className="ml-2">Resumen de Elementos</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportes.map((reporte, index) => (
                      <div key={`summary-${reporte.idCategoria}`} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: coloresPie[index % coloresPie.length] }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {reporte.categoria}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">S/ {reporte.ingresosTotales.toLocaleString()}</span>
                              <span className="mx-2">•</span>
                              <span>{reporte.cantidadTotalVendida} unidades</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {reporte.cantidadProductosVendidos} productos diferentes
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-gray-700">
                              {((reporte.ingresosTotales / totalIngresos) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">del total</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

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
