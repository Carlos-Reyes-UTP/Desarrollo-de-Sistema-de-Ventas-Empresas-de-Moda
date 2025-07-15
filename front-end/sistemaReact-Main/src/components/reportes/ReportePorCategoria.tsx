import React, { useState, useEffect } from 'react';
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
import type { ReporteCategoriaData, FiltrosReporte } from '../../interfaces/ReporteVentas';

const ReportePorCategoria: React.FC = () => {
  const [reportes, setReportes] = useState<ReporteCategoriaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'pie' | 'tabla'>('barras');

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener datos reales del backend
        const data = await ReporteService.getReportePorCategoria(filtros);
        setReportes(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el reporte por categoría');
        console.error('Error:', err);
        // En caso de error, mantener lista vacía en lugar de datos de ejemplo
        setReportes([]);
      } finally {
        setLoading(false);
      }
    };

    cargarReportes();
  }, [filtros]);

  const coloresPie = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const exportarDatos = () => {
    if (reportes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

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

    // Generar nombre del archivo con fecha
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_categorias_${fechaActual}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Cargando reportes por categoría...</span>
        </div>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Selector de vista */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {['barras', 'pie', 'tabla'].map((vista) => (
          <button
            key={vista}
            onClick={() => setVistaGrafico(vista as any)}
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

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">
            {reportes.length}
          </div>
          <div className="text-sm text-blue-600">Categorías activas</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">
            {reportes.reduce((sum, r) => sum + r.cantidadTotalVendida, 0)}
          </div>
          <div className="text-sm text-green-600">Total unidades</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">
            S/ {totalIngresos.toLocaleString()}
          </div>
          <div className="text-sm text-purple-600">Ingresos totales</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">
            {reportes.reduce((sum, r) => sum + r.cantidadProductosVendidos, 0)}
          </div>
          <div className="text-sm text-orange-600">Productos vendidos</div>
        </div>
      </div>

      {/* Visualización de datos */}
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
                  label={({ categoria, ingresosTotales }) => 
                    `${categoria}: S/ ${ingresosTotales.toLocaleString()}`
                  }
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
                    Categoría
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportes.map((reporte, index) => (
                  <tr key={reporte.categoria} className="hover:bg-gray-50">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default ReportePorCategoria;
