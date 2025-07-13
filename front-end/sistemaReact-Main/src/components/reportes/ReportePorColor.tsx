import React, { useState, useEffect } from 'react';
import {
  SwatchIcon,
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
import type { ReporteColorData, FiltrosReporte } from '../../interfaces/ReporteVentas';

const ReportePorColor: React.FC = () => {
  const [reportes, setReportes] = useState<ReporteColorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'pie' | 'tabla'>('pie');

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener datos reales del backend
        const data = await ReporteService.getReportePorColor(filtros);
        setReportes(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el reporte por color');
        console.error('Error:', err);
        // En caso de error, mantener lista vacía en lugar de datos de ejemplo
        setReportes([]);
      } finally {
        setLoading(false);
      }
    };

    cargarReportes();
  }, [filtros]);

  const coloresVisuales: { [key: string]: string } = {
    'Negro': '#1F2937',
    'Blanco': '#F9FAFB',
    'Azul': '#3B82F6',
    'Gris': '#6B7280',
    'Rojo': '#EF4444',
    'Verde': '#10B981',
    'Rosa': '#EC4899',
    'Amarillo': '#F59E0B'
  };

  const exportarDatos = () => {
    if (reportes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = reportes.map(reporte => ({
      'Color': reporte.nombreColor,
      'Cantidad Vendida': reporte.cantidadVendida,
      'Ingresos Totales (S/)': reporte.ingresosTotales,
      'Productos Distintos': reporte.productosDistintos,
      'Porcentaje del Total': `${reporte.porcentajeDelTotal.toFixed(1)}%`
    }));

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Color');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 20 }, // Color
      { wch: 18 }, // Cantidad Vendida
      { wch: 20 }, // Ingresos Totales
      { wch: 18 }, // Productos Distintos
      { wch: 18 }  // Porcentaje
    ];
    ws['!cols'] = colWidths;

    // Generar nombre del archivo con fecha
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_colores_${fechaActual}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Cargando reportes por color...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <SwatchIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalIngresos = reportes.reduce((sum, r) => sum + r.ingresosTotales, 0);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ventas por Color</h2>
          <p className="text-gray-600 mt-1">
            Distribución de ventas por colores de productos
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
          <div className="text-sm text-blue-600">Colores disponibles</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">
            {reportes.reduce((sum, r) => sum + r.cantidadVendida, 0)}
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
            {reportes.reduce((sum, r) => sum + r.productosDistintos, 0)}
          </div>
          <div className="text-sm text-orange-600">Productos distintos</div>
        </div>
      </div>

      {/* Visualización de datos */}
      {vistaGrafico === 'barras' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Color</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombreColor" />
                <YAxis />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Cantidad']} />
                <Bar 
                  dataKey="cantidadVendida" 
                  fill="#8B5CF6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {vistaGrafico === 'pie' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Color</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nombreColor, porcentajeDelTotal }) => 
                    `${nombreColor}: ${porcentajeDelTotal}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="cantidadVendida"
                >
                  {reportes.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={coloresVisuales[entry.nombreColor] || `hsl(${index * 45}, 70%, 60%)`} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Cantidad']} />
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
                    Color
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad Vendida
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos Totales
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos Distintos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportes.map((reporte) => (
                  <tr key={reporte.nombreColor} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="flex-shrink-0 h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center"
                          style={{ backgroundColor: coloresVisuales[reporte.nombreColor] || '#8B5CF6' }}
                        >
                          <SwatchIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{reporte.nombreColor}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.cantidadVendida.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      S/.{reporte.ingresosTotales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.productosDistintos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.porcentajeDelTotal.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportePorColor;
