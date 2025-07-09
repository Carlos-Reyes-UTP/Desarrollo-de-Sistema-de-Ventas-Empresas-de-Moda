import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, FileText, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { VentaService } from '../../services/VentaServices';
import type { Venta } from '../../interfaces/Venta';

interface ReporteData {
  fecha: string;
  ventas: number;
  cantidad: number;
}

interface DetalleExportacion {
  usuario: string;
  fechaVenta: string;
  metodoPago: string;
  cliente: string;
  tipoComprobante: string;
  nombreVariante: string;
  cantidad: number;
  precioVendido: number;
  subtotal: number;
}

type TipoPeriodo = 'diario' | 'semanal' | 'mensual';

const Reportes: React.FC = () => {
  const [periodo, setPeriodo] = useState<TipoPeriodo>('semanal');
  const [fechaReferencia, setFechaReferencia] = useState(new Date().toISOString().split('T')[0]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [datosGrafico, setDatosGrafico] = useState<ReporteData[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resumenVentas, setResumenVentas] = useState({
    totalVentas: 0,
    cantidadTransacciones: 0,
    ticketPromedio: 0,
    productosVendidos: 0
  });

  // Cargar datos al cambiar filtros
  useEffect(() => {
    cargarDatos();
  }, [periodo, fechaReferencia]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const fechaRef = new Date(fechaReferencia);
      let fechaInicio: Date;
      let fechaFin: Date;

      // Calcular rango de fechas según el período
      switch (periodo) {
        case 'diario':
          fechaInicio = new Date(fechaRef);
          fechaFin = new Date(fechaRef);
          break;
        case 'semanal':
          fechaInicio = new Date(fechaRef);
          fechaInicio.setDate(fechaRef.getDate() - fechaRef.getDay());
          fechaFin = new Date(fechaInicio);
          fechaFin.setDate(fechaInicio.getDate() + 6);
          break;
        case 'mensual':
          fechaInicio = new Date(fechaRef.getFullYear(), fechaRef.getMonth(), 1);
          fechaFin = new Date(fechaRef.getFullYear(), fechaRef.getMonth() + 1, 0);
          break;
      }

      // Obtener todas las ventas y filtrar por rango
      const todasLasVentas = await VentaService.obtenerTodasVentas();
      const ventasFiltradas = Array.isArray(todasLasVentas) 
        ? todasLasVentas.filter(venta => {
            const fechaVenta = new Date(venta.fechaVenta);
            return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
          })
        : [];

      setVentas(ventasFiltradas);
      procesarDatosGrafico(ventasFiltradas, periodo, fechaInicio, fechaFin);
      calcularResumenVentas(ventasFiltradas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatosGrafico = (ventas: Venta[], tipoPeriodo: TipoPeriodo, fechaInicio: Date, fechaFin: Date) => {
    const datos: ReporteData[] = [];

    if (tipoPeriodo === 'diario') {
      // Agrupar por horas del día
      for (let hora = 0; hora < 24; hora++) {
        const ventasHora = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fechaVenta);
          return fechaVenta.getHours() === hora;
        });

        datos.push({
          fecha: `${hora}:00`,
          ventas: ventasHora.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
          cantidad: ventasHora.length
        });
      }
    } else if (tipoPeriodo === 'semanal') {
      // Agrupar por días de la semana
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      for (let dia = 0; dia < 7; dia++) {
        const fechaDia = new Date(fechaInicio);
        fechaDia.setDate(fechaInicio.getDate() + dia);

        const ventasDia = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fechaVenta);
          return fechaVenta.toDateString() === fechaDia.toDateString();
        });

        datos.push({
          fecha: diasSemana[fechaDia.getDay()],
          ventas: ventasDia.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
          cantidad: ventasDia.length
        });
      }
    } else if (tipoPeriodo === 'mensual') {
      // Agrupar por semanas del mes
      const semanaInicio = new Date(fechaInicio);
      let semanaNum = 1;

      while (semanaInicio <= fechaFin) {
        const semanaFin = new Date(semanaInicio);
        semanaFin.setDate(semanaInicio.getDate() + 6);

        if (semanaFin > fechaFin) {
          semanaFin.setTime(fechaFin.getTime());
        }

        const ventasSemana = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fechaVenta);
          return fechaVenta >= semanaInicio && fechaVenta <= semanaFin;
        });

        datos.push({
          fecha: `Sem ${semanaNum}`,
          ventas: ventasSemana.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
          cantidad: ventasSemana.length
        });

        semanaInicio.setDate(semanaInicio.getDate() + 7);
        semanaNum++;
      }
    }

    setDatosGrafico(datos);
  };

  const calcularResumenVentas = (ventas: Venta[]) => {
    const totalVentas = ventas.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0);
    const cantidadTransacciones = ventas.length;
    const ticketPromedio = cantidadTransacciones > 0 ? totalVentas / cantidadTransacciones : 0;
    const productosVendidos = ventas.reduce((sum, venta) => {
      return sum + (venta.detalles?.reduce((detSum, detalle) => detSum + detalle.cantidad, 0) || 0);
    }, 0);

    setResumenVentas({
      totalVentas,
      cantidadTransacciones,
      ticketPromedio,
      productosVendidos
    });
  };

  const exportarAExcel = () => {
    if (ventas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExportacion: DetalleExportacion[] = [];

    ventas.forEach(venta => {
      if (venta.detalles && venta.detalles.length > 0) {
        venta.detalles.forEach(detalle => {
          datosExportacion.push({
            usuario: venta.usuario?.usuario || 'No disponible',
            fechaVenta: new Date(venta.fechaVenta).toLocaleDateString(),
            metodoPago: venta.metodoPago?.nombre || 'No disponible',
            cliente: venta.cliente?.nombreCliente || 'Cliente general',
            tipoComprobante: venta.tipoComprobante || 'Boleta',
            nombreVariante: detalle.productoVariante 
              ? `${detalle.productoVariante.producto?.nombre || 'Producto'} - ${detalle.productoVariante.color?.nombre || 'Color'} - ${detalle.productoVariante.talla?.nombreTalla || 'Talla'}`
              : 'Producto no disponible',
            cantidad: detalle.cantidad,
            precioVendido: detalle.precioUnitario,
            subtotal: detalle.cantidad * detalle.precioUnitario
          });
        });
      } else {
        // Si no hay detalles, crear una fila con la información de la venta
        datosExportacion.push({
          usuario: venta.usuario?.usuario || 'No disponible',
          fechaVenta: new Date(venta.fechaVenta).toLocaleDateString(),
          metodoPago: venta.metodoPago?.nombre || 'No disponible',
          cliente: venta.cliente?.nombreCliente || 'Cliente general',
          tipoComprobante: venta.tipoComprobante || 'Boleta',
          nombreVariante: 'Sin detalles disponibles',
          cantidad: 0,
          precioVendido: 0,
          subtotal: venta.totalVentas || 0
        });
      }
    });

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datosExportacion);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Ventas');

    // Generar nombre del archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_ventas_${periodo}_${fechaActual}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes de Ventas</h1>
          <p className="text-gray-600">Análisis y exportación de datos de ventas</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="periodo-select" className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                id="periodo-select"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as TipoPeriodo)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="fecha-referencia" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de referencia
              </label>
              <input
                id="fecha-referencia"
                type="date"
                value={fechaReferencia}
                onChange={(e) => setFechaReferencia(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={exportarAExcel}
              disabled={cargando || ventas.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={16} />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatearMoneda(resumenVentas.totalVentas)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resumenVentas.cantidadTransacciones}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatearMoneda(resumenVentas.ticketPromedio)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos Vendidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resumenVentas.productosVendidos}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {(() => {
                if (periodo === 'diario') return 'Ventas por Hora';
                if (periodo === 'semanal') return 'Ventas por Día';
                return 'Ventas por Semana';
              })()}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
            </div>
          </div>
          
          <div className="h-80">
            {cargando ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'ventas' ? formatearMoneda(Number(value)) : value,
                      name === 'ventas' ? 'Ventas' : 'Cantidad'
                    ]}
                  />
                  <Bar dataKey="ventas" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabla de datos recientes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Últimas Ventas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método Pago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.slice(0, 10).map((venta) => (
                  <tr key={venta.idVenta} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(venta.fechaVenta).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.usuario?.usuario || 'No disponible'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.cliente?.nombreCliente || 'Cliente general'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatearMoneda(venta.totalVentas || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venta.metodoPago?.nombre || 'No disponible'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {ventas.length === 0 && !cargando && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay ventas en el período seleccionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;
