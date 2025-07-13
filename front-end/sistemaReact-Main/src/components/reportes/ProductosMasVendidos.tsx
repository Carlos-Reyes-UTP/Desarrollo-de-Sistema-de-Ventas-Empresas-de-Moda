import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
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
import type { ProductoMasVendido, FiltrosReporte } from '../../interfaces/ReporteVentas';

const ProductosMasVendidos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'linea' | 'tabla'>('barras');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener datos reales del backend
        const data = await ReporteService.getProductosMasVendidos(filtros);
        setProductos(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los productos más vendidos');
        console.error('Error:', err);
        // En caso de error, mantener lista vacía en lugar de datos de ejemplo
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };

    cargarProductos();
  }, [filtros]);

  const productosFiltrados = productos.filter(producto =>
    producto.nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
    (producto.categoria && producto.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const exportarDatos = () => {
    if (productosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = productosFiltrados.map(producto => ({
      'Producto': producto.nombreProducto,
      'Categoría': producto.categoria || 'Sin categoría',
      'Cantidad Vendida': producto.cantidadVendida,
      'Ingreso Total (S/)': producto.ingresosTotales,
      'Precio Promedio (S/)': producto.precioPromedio,
      'Código': producto.codigoIdentificacion
    }));

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos Más Vendidos');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 30 }, // Producto
      { wch: 20 }, // Categoría
      { wch: 15 }, // Cantidad
      { wch: 15 }, // Ingreso
      { wch: 15 }, // Precio
      { wch: 15 }  // Código
    ];
    ws['!cols'] = colWidths;

    // Generar nombre del archivo con fecha
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `productos_mas_vendidos_${fechaActual}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Cargando productos más vendidos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productos Más Vendidos</h2>
          <p className="text-gray-600 mt-1">
            Ranking de productos por cantidad vendida e ingresos generados
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
          
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <FunnelIcon className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y vista */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
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
      </div>

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">
            {productosFiltrados.length}
          </div>
          <div className="text-sm text-blue-600">Productos en ranking</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">
            {productosFiltrados.reduce((sum, p) => sum + p.cantidadVendida, 0)}
          </div>
          <div className="text-sm text-green-600">Total unidades vendidas</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">
            S/.{productosFiltrados.reduce((sum, p) => sum + p.ingresosTotales, 0).toLocaleString()}
          </div>
          <div className="text-sm text-purple-600">Ingresos totales</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">
            S/.{(productosFiltrados.reduce((sum, p) => sum + p.precioPromedio, 0) / productosFiltrados.length).toFixed(0)}
          </div>
          <div className="text-sm text-orange-600">Precio promedio</div>
        </div>
      </div>

      {/* Visualización de datos */}
      {vistaGrafico === 'barras' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cantidad Vendida por Producto</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productosFiltrados.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nombreProducto" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Cantidad Vendida']} />
                <Bar dataKey="cantidadVendida" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {vistaGrafico === 'linea' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Producto</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productosFiltrados.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nombreProducto" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip formatter={(value) => [`S/.${Number(value).toLocaleString()}`, 'Ingresos']} />
                <Line type="monotone" dataKey="ingresosTotales" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
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
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Prom.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosFiltrados.map((producto, index) => (
                  <tr key={producto.idProducto} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{producto.nombreProducto}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {producto.categoria || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {producto.cantidadVendida}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      S/.{producto.ingresosTotales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      S/.{producto.precioPromedio}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {producto.codigoIdentificacion}
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

export default ProductosMasVendidos;
