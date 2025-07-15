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
import { CategoriaService } from '../../services/CategoriaServices';
import type { Categoria } from '../../interfaces/Categoria';

// Componente para tooltip personalizado de gráficos
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-2">{data.nombreProducto}</h4>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Categoría Principal:</span> {data.categoriaPadre || 'No especificada'}</p>
          <p><span className="font-medium">Sub Categoría:</span> {data.categoria || 'No especificada'}</p>
          <p><span className="font-medium">Segunda Sub Categoría:</span> {data.subCategoria2 || 'No especificada'}</p>
          <p><span className="font-medium">Cantidad Vendida:</span> {data.cantidadVendida}</p>
        </div>
      </div>
    );
  }
  return null;
};

const ProductosMasVendidos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosReporte>({});
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'linea' | 'tabla'>('barras');
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaPadre, setCategoriaPadre] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  useEffect(() => {
    CategoriaService.obtenerCategoriasPrincipales().then(setCategorias);
  }, []);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoading(true);
        setError(null);
        let filtrosReporte = { ...filtros };
        
        if (categoriaPadre) {
          filtrosReporte = { ...filtrosReporte, idCategoriaPadre: categoriaPadre };
        }
        
        if (fechaInicio && fechaFin) {
          // Convertir fechas a formato ISO con hora
          const fechaInicioISO = new Date(fechaInicio + 'T00:00:00').toISOString();
          const fechaFinISO = new Date(fechaFin + 'T23:59:59').toISOString();
          filtrosReporte = { 
            ...filtrosReporte, 
            fechaInicio: fechaInicioISO,
            fechaFin: fechaFinISO
          };
        }
        
        console.log('Filtros enviados al backend:', filtrosReporte);
        const data = await ReporteService.getProductosMasVendidos(filtrosReporte);
        setProductos(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los productos más vendidos');
        console.error('Error:', err);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };
    cargarProductos();
  }, [filtros, categoriaPadre, fechaInicio, fechaFin]);

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setCategoriaPadre('');
    setFechaInicio('');
    setFechaFin('');
    setBusqueda('');
    // No cerramos el panel de filtros automáticamente
  };

  // Función para aplicar filtros rápidos
  const aplicarFiltroRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    const hoy = new Date();
    // Usar zona horaria local para evitar problemas con UTC
    const fechaFinStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    switch (tipo) {
      case 'hoy':
        setFechaInicio(fechaFinStr);
        setFechaFin(fechaFinStr);
        break;
      case 'semana': {
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hoy.getDate() - 7);
        const fechaInicioStr = `${hace7Dias.getFullYear()}-${String(hace7Dias.getMonth() + 1).padStart(2, '0')}-${String(hace7Dias.getDate()).padStart(2, '0')}`;
        setFechaInicio(fechaInicioStr);
        setFechaFin(fechaFinStr);
        break;
      }
      case 'mes': {
        const hace30Dias = new Date(hoy);
        hace30Dias.setDate(hoy.getDate() - 30);
        const fechaInicioStr = `${hace30Dias.getFullYear()}-${String(hace30Dias.getMonth() + 1).padStart(2, '0')}-${String(hace30Dias.getDate()).padStart(2, '0')}`;
        setFechaInicio(fechaInicioStr);
        setFechaFin(fechaFinStr);
        break;
      }
    }
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
    (producto.categoria?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  // Función para generar el formato completo de categorías
  const formatearCategoriaCompleta = (producto: ProductoMasVendido): string => {
    const partes: string[] = [];
    
    if (producto.categoriaPadre) {
      partes.push(producto.categoriaPadre);
    }
    
    if (producto.categoria) {
      partes.push(producto.categoria);
    }
    
    if (producto.subCategoria2) {
      partes.push(producto.subCategoria2);
    }
    
    return partes.length > 0 ? partes.join('-') : 'Sin categoría';
  };

  const exportarDatos = () => {
    if (productosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = productosFiltrados.map(producto => ({
      'Producto': producto.nombreProducto,
      'Categoría': formatearCategoriaCompleta(producto),
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
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 transform transition-all duration-300 ease-out">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Cargando reporte</h3>
              <p className="text-sm text-gray-600">Generando productos más vendidos...</p>
            </div>
          </div>
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
        <div className="flex gap-2 flex-wrap">
          <select
            value={categoriaPadre}
            onChange={e => setCategoriaPadre(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.idCategoria} value={cat.idCategoria}>{cat.nombre}</option>
            ))}
          </select>
          <button
            onClick={exportarDatos}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar Excel
          </button>
          <button 
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              mostrarFiltros 
                ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <FunnelIcon className={`h-4 w-4 transition-transform duration-300 ${
              mostrarFiltros ? 'rotate-180' : 'rotate-0'
            }`} />
            <span className="font-medium">
              {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </span>
            {(fechaInicio || fechaFin || categoriaPadre) && !mostrarFiltros && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Panel de filtros expandible con animación */}
      <div className={`transition-all duration-500 ease-out overflow-hidden ${
        mostrarFiltros 
          ? 'max-h-screen opacity-100 transform translate-y-0' 
          : 'max-h-0 opacity-0 transform -translate-y-2'
      }`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transform transition-all duration-300 ease-out">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Búsqueda</h3>
            <button
              onClick={() => setMostrarFiltros(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Cerrar filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Filtros de fecha */}
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de inicio
              </label>
              <input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  e.stopPropagation();
                  setFechaInicio(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de fin
              </label>
              <input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  e.stopPropagation();
                  setFechaFin(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700 self-center">Filtros rápidos:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                aplicarFiltroRapido('hoy');
              }}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                aplicarFiltroRapido('semana');
              }}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
            >
              Última semana
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                aplicarFiltroRapido('mes');
              }}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
            >
              Último mes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                limpiarFiltros();
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>

          {/* Indicador de filtros activos */}
          {(fechaInicio || fechaFin || categoriaPadre) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800">Filtros aplicados:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fechaInicio && (
                  <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium shadow-sm">
                    📅 Desde: {fechaInicio}
                  </span>
                )}
                {fechaFin && (
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium shadow-sm">
                    📅 Hasta: {fechaFin}
                  </span>
                )}
                {categoriaPadre && (
                  <span className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium shadow-sm">
                    🏷️ {categorias.find(c => c.idCategoria?.toString() === categoriaPadre)?.nombre}
                  </span>
                )}
              </div>
            </div>
          )}
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
          {['barras', 'linea', 'tabla'].map((vista) => {
            let textoVista = 'Tabla';
            if (vista === 'barras') textoVista = 'Barras';
            else if (vista === 'linea') textoVista = 'Línea';
            
            return (
              <button
                key={vista}
                onClick={() => setVistaGrafico(vista as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  vistaGrafico === vista
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {textoVista}
              </button>
            );
          })}
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
            S/ {productosFiltrados.reduce((sum, p) => sum + p.ingresosTotales, 0).toLocaleString()}
          </div>
          <div className="text-sm text-purple-600">Ingresos totales</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">
            {`S/ ${(productosFiltrados.length > 0 ? (productosFiltrados.reduce((sum, p) => sum + p.precioPromedio, 0) / productosFiltrados.length).toFixed(0) : '0')}`}
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
                <Tooltip content={<CustomTooltip />} />
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
                <Tooltip content={<CustomTooltip />} />
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
                        {formatearCategoriaCompleta(producto)}
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
