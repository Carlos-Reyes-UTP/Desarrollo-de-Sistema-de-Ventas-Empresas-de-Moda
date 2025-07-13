import React, { useState, useEffect } from 'react';
import {
  TagIcon,
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
  LineChart,
  Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import type { ReporteTallaData, FiltrosReporte } from '../../interfaces/ReporteVentas';

const ReportePorTalla: React.FC = () => {
  const [reportes, setReportes] = useState<ReporteTallaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'linea' | 'tabla'>('barras');

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener datos reales del backend
        const data = await ReporteService.getReportePorTalla(filtros);
        setReportes(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el reporte por talla');
        console.error('Error:', err);
        // En caso de error, mantener lista vacía en lugar de datos de ejemplo
        setReportes([]);
      } finally {
        setLoading(false);
      }
    };

    cargarReportes();
  }, [filtros]);

  const exportarDatos = () => {
    if (reportes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = reportes.map(reporte => ({
      'Talla': reporte.nombreTalla,
      'Cantidad Vendida': reporte.cantidadVendida,
      'Ingresos Totales (S/)': reporte.ingresosTotales,
      'Productos Distintos': reporte.productosDistintos,
      'Porcentaje del Total': `${reporte.porcentajeDelTotal.toFixed(1)}%`
    }));

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte por Talla');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Talla
      { wch: 18 }, // Cantidad Vendida
      { wch: 20 }, // Ingresos Totales
      { wch: 18 }, // Productos Distintos
      { wch: 18 }  // Porcentaje
    ];
    ws['!cols'] = colWidths;

    // Generar nombre del archivo con fecha
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_tallas_${fechaActual}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Cargando reportes por talla...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalIngresos = reportes.reduce((sum, r) => sum + r.ingresosTotales, 0);
  const coloresGrafico = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ventas por Talla</h2>
          <p className="text-gray-600 mt-1">
            Análisis de preferencias y ventas por tallas
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
        {['barras', 'linea', 'tabla'].map((vista) => (
          <button
            key={vista}
            onClick={() => setVistaGrafico(vista as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vistaGrafico === vista
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {vista === 'barras' ? 'Barras' : vista === 'linea' ? 'Línea' : 'Tabla'}
          </button>
        ))}
      </div>

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">
            {reportes.length}
          </div>
          <div className="text-sm text-blue-600">Tallas disponibles</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">
            {reportes.reduce((sum, r) => sum + r.cantidadVendida, 0)}
          </div>
          <div className="text-sm text-green-600">Total unidades</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">
            ${totalIngresos.toLocaleString()}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Talla</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombreTalla" />
                <YAxis />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Cantidad']} />
                <Bar dataKey="cantidadVendida" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {vistaGrafico === 'linea' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ventas por Talla</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombreTalla" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
                <Line 
                  type="monotone" 
                  dataKey="ingresosTotales" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
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
                    Talla
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Popularidad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportes.map((reporte, index) => (
                  <tr key={reporte.nombreTalla} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="flex-shrink-0 h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: coloresGrafico[index % coloresGrafico.length] + '20', color: coloresGrafico[index % coloresGrafico.length] }}
                        >
                          {reporte.nombreTalla}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">Talla {reporte.nombreTalla}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.cantidadVendida.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${reporte.ingresosTotales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.productosDistintos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {reporte.porcentajeDelTotal.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center">
                        <div 
                          className="w-16 bg-gray-200 rounded-full h-2"
                          title={`${reporte.porcentajeDelTotal.toFixed(1)}% del total`}
                        >
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${reporte.porcentajeDelTotal}%`,
                              backgroundColor: coloresGrafico[index % coloresGrafico.length]
                            }}
                          />
                        </div>
                      </div>
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

export default ReportePorTalla;
