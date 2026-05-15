import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, FileText, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { VentaService } from '../../services/VentaService';
import type { Venta } from '../../types/Venta';
import { AlertModal } from '@/shared/ui';

interface ReporteData {
  fecha: string;
  ventas: number;
  cantidad: number;
}

interface DetalleExportacion {
  "Usuario": string;
  "Fecha de Venta": string;
  "Metodo De Pago": string;
  "Cliente": string;
  "Tipo de Comprobante": string;
  "Nombre del Producto": string;
  "Cantidad": number;
  "Precio Vendido": number;
  "Sub Total": number;
}

type TipoPeriodo = 'diario' | 'semanal' | 'mensual';

const ReporteDeVentas: React.FC = () => {
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
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ventasPorPagina = 10;

  // Función auxiliar para parsear fechas del backend de manera consistente
  const parsearFechaVenta = (fechaStr: string): Date => {
    try {
      // Manejar el formato "YYYY-MM-DD HH:mm:ss.ffffff" del backend
      if (fechaStr.includes(' ')) {
        // Formato: "2025-07-09 01:29:12.000000"
        const [fecha, hora] = fechaStr.split(' ');
        const [year, month, day] = fecha.split('-').map(Number);
        const [hours, minutes, secondsStr] = hora.split(':');
        
        // Extraer segundos y microsegundos si existen
        const seconds = parseFloat(secondsStr.split('.')[0]);
        const milliseconds = secondsStr.includes('.') 
          ? parseInt(secondsStr.split('.')[1].substring(0, 3).padEnd(3, '0'))
          : 0;
        
        const fechaParseada = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), seconds, milliseconds);
        return fechaParseada;
      } else {
        // Formato ISO estándar
        return new Date(fechaStr);
      }
    } catch (error) {
      console.warn('⚠️ Error al parsear fecha:', fechaStr, error);
      return new Date(); // Fecha actual como fallback
    }
  };

  // Cargar datos al cambiar filtros
  useEffect(() => {
    cargarDatos();
  }, [periodo, fechaReferencia]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [periodo, fechaReferencia]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Crear fecha de referencia en hora local (no UTC)
      const [year, month, day] = fechaReferencia.split('-').map(Number);
      const fechaRef = new Date(year, month - 1, day); // Crear en hora local
      
      let fechaInicio: Date;
      let fechaFin: Date;

      // Calcular rango de fechas según el período
      switch (periodo) {
        case 'diario':
          // Para diario: desde las 00:00:00 hasta las 23:59:59 del día seleccionado
          fechaInicio = new Date(year, month - 1, day, 0, 0, 0, 0);
          fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999);
          break;
        case 'semanal':
          // Para semanal: desde el domingo hasta el sábado
          fechaInicio = new Date(fechaRef);
          fechaInicio.setDate(fechaRef.getDate() - fechaRef.getDay());
          fechaInicio.setHours(0, 0, 0, 0);
          fechaFin = new Date(fechaInicio);
          fechaFin.setDate(fechaInicio.getDate() + 6);
          fechaFin.setHours(23, 59, 59, 999);
          break;
        case 'mensual':
          // Para mensual: primer día del mes hasta último día del mes
          fechaInicio = new Date(year, month - 1, 1, 0, 0, 0, 0);
          fechaFin = new Date(year, month, 0, 23, 59, 59, 999); // Último día del mes
          break;
      }

      console.log(`🔍 Cargando datos para período ${periodo}:`, {
        fechaReferencia,
        fechaInicio: fechaInicio.toLocaleString('es-PE'),
        fechaFin: fechaFin.toLocaleString('es-PE')
      });

      // Obtener todas las ventas y filtrar por rango
      const todasLasVentas = await VentaService.obtenerTodasVentas();
      console.log('📊 Total de ventas obtenidas:', todasLasVentas?.length || 0);
      
      const ventasFiltradas = Array.isArray(todasLasVentas) 
        ? todasLasVentas.filter(venta => {
            const fechaVenta = parsearFechaVenta(venta.fechaVenta);
            
            // Verificar si la fecha es válida
            if (isNaN(fechaVenta.getTime())) {
              console.warn('⚠️ Fecha inválida encontrada:', venta.fechaVenta);
              return false;
            }
            
            const estaEnRango = fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
            if (periodo === 'diario') {
              console.log('🔍 Verificando fecha:', {
                fechaOriginal: venta.fechaVenta,
                fechaParseada: fechaVenta.toLocaleString('es-PE'),
                fechaInicio: fechaInicio.toLocaleString('es-PE'),
                fechaFin: fechaFin.toLocaleString('es-PE'),
                estaEnRango
              });
            }
            
            return estaEnRango;
          })
        : [];

      console.log('✅ Ventas filtradas para el período:', ventasFiltradas.length);

      setVentas(ventasFiltradas);
      procesarDatosGrafico(ventasFiltradas, periodo, fechaInicio, fechaFin);
      calcularResumenVentas(ventasFiltradas);
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
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
          const fechaVenta = parsearFechaVenta(venta.fechaVenta);
          return fechaVenta && fechaVenta.getHours() === hora;
        });

        datos.push({
          fecha: `${hora.toString().padStart(2, '0')}:00`,
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
        fechaDia.setHours(0, 0, 0, 0);
        
        const fechaDiaFin = new Date(fechaDia);
        fechaDiaFin.setHours(23, 59, 59, 999);

        const ventasDia = ventas.filter(venta => {
          const fechaVenta = parsearFechaVenta(venta.fechaVenta);
          return fechaVenta && fechaVenta >= fechaDia && fechaVenta <= fechaDiaFin;
        });

        datos.push({
          fecha: `${diasSemana[fechaDia.getDay()]} ${fechaDia.getDate()}`,
          ventas: ventasDia.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
          cantidad: ventasDia.length
        });
      }
    } else if (tipoPeriodo === 'mensual') {
      // Agrupar por semanas del mes
      const semanaInicio = new Date(fechaInicio);
      let semanaNum = 1;

      while (semanaInicio <= fechaFin) {
        const semanaFinLocal = new Date(semanaInicio);
        semanaFinLocal.setDate(semanaInicio.getDate() + 6);
        semanaFinLocal.setHours(23, 59, 59, 999);

        if (semanaFinLocal > fechaFin) {
          semanaFinLocal.setTime(fechaFin.getTime());
        }

        const ventasSemana = ventas.filter(venta => {
          const fechaVenta = parsearFechaVenta(venta.fechaVenta);
          return fechaVenta && fechaVenta >= semanaInicio && fechaVenta <= semanaFinLocal;
        });

        // Formatear las fechas para mostrar el rango de la semana
        const inicioStr = `${semanaInicio.getDate()}/${semanaInicio.getMonth() + 1}`;
        const finStr = `${semanaFinLocal.getDate()}/${semanaFinLocal.getMonth() + 1}`;

        datos.push({
          fecha: `${inicioStr}-${finStr}`,
          ventas: ventasSemana.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
          cantidad: ventasSemana.length
        });

        semanaInicio.setDate(semanaInicio.getDate() + 7);
        semanaNum++;
      }
    }

    console.log('📈 Datos procesados para gráfico:', datos);
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

  const exportarAExcel = async () => {
    if (ventas.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      // Mostrar indicador de carga
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      loadingToast.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generando reporte de ventas...</span>
      `;
      document.body.appendChild(loadingToast);

      const datosExportacion: DetalleExportacion[] = [];

    ventas.forEach(venta => {
      if (venta.detalles && venta.detalles.length > 0) {
        venta.detalles.forEach(detalle => {
          // Construir el nombre completo de la variante con color y talla
          const nombreProducto = (detalle as any).producto?.nombre || detalle.productoVariante?.producto?.nombre || 'Producto sin nombre';
          const nombreColor = detalle.productoVariante?.color?.nombre || 'Sin color';
          const nombreTalla = detalle.productoVariante?.talla?.nombreTalla || 'Talla única';
          const nombreCompleto = `${nombreProducto} - ${nombreColor} - ${nombreTalla}`;
          
          // Manejar método de pago que viene como string o como objeto
          const metodoPago = typeof venta.metodoPago === 'string' 
            ? venta.metodoPago 
            : (venta.metodoPago?.nombre || venta.metodoPago?.tipo || 'No disponible');
          
          datosExportacion.push({
            "Usuario": venta.usuario?.usuario || 'No disponible',
            "Fecha de Venta": parsearFechaVenta(venta.fechaVenta).toLocaleString('es-PE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }),
            "Metodo De Pago": metodoPago,
            "Cliente": venta.cliente?.nombreCliente || 'Cliente general',
            "Tipo de Comprobante": venta.tipoComprobante || 'Boleta',
            "Nombre del Producto": nombreCompleto,
            "Cantidad": detalle.cantidad,
            "Precio Vendido": detalle.precioUnitario,
            "Sub Total": detalle.cantidad * detalle.precioUnitario
          });
        });
      } else {
        // Si no hay detalles, crear una fila con la información de la venta
        const metodoPago = typeof venta.metodoPago === 'string' 
          ? venta.metodoPago 
          : (venta.metodoPago?.nombre || venta.metodoPago?.tipo || 'No disponible');
        
        datosExportacion.push({
          "Usuario": venta.usuario?.usuario || 'No disponible',
          "Fecha de Venta": parsearFechaVenta(venta.fechaVenta).toLocaleString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }),
          "Metodo De Pago": metodoPago,
          "Cliente": venta.cliente?.nombreCliente || 'Cliente general',
          "Tipo de Comprobante": venta.tipoComprobante || 'Boleta',
          "Nombre del Producto": 'Sin detalles disponibles',
          "Cantidad": 0,
          "Precio Vendido": 0,
          "Sub Total": venta.totalVentas || 0
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

    // Remover indicador de carga y mostrar éxito
    document.body.removeChild(loadingToast);
    
    const successToast = document.createElement('div');
    successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    successToast.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>Reporte de ventas exportado exitosamente</span>
    `;
    document.body.appendChild(successToast);
    
    setTimeout(() => {
      if (document.body.contains(successToast)) {
        document.body.removeChild(successToast);
      }
    }, 3000);

    } catch (error) {
      console.error('Error al exportar datos:', error);

      // Remover indicador de carga si existe
      const existingToast = document.querySelector('.fixed.top-4.right-4.bg-blue-600');
      if (existingToast && document.body.contains(existingToast)) {
        document.body.removeChild(existingToast);
      }

      setAlertModal({ open: true, message: 'Error al generar el reporte. Inténtalo nuevamente.', variant: 'error' });
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  };

  return (
    <div className="p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporte de Ventas</h1>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Últimas Ventas del Período ({ventas.length} total{ventas.length !== 1 ? 'es' : ''})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
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
                {(() => {
                  // Ordenar las ventas por fecha más reciente primero
                  const ventasOrdenadas = [...ventas].sort((a, b) => {
                    const fechaA = parsearFechaVenta(a.fechaVenta);
                    const fechaB = parsearFechaVenta(b.fechaVenta);
                    return fechaB.getTime() - fechaA.getTime();
                  });

                  // Calcular paginación
                  const indiceInicio = (paginaActual - 1) * ventasPorPagina;
                  const indiceFin = indiceInicio + ventasPorPagina;
                  const ventasPagina = ventasOrdenadas.slice(indiceInicio, indiceFin);

                  return ventasPagina.map((venta) => {
                    // Función para formatear la fecha correctamente
                    const formatearFechaHora = (fechaStr: string) => {
                      try {
                        const fecha = parsearFechaVenta(fechaStr);
                        
                        if (isNaN(fecha.getTime())) {
                          return 'Fecha inválida';
                        }
                        
                        return fecha.toLocaleString('es-PE', {
                          year: 'numeric',
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        });
                      } catch (error) {
                        console.error('Error al formatear fecha:', fechaStr, error);
                        return 'Error en fecha';
                      }
                    };

                    // Obtener método de pago de forma segura
                    const obtenerMetodoPago = () => {
                      try {
                        const metodoPago = venta.metodoPago;
                        if (metodoPago) {
                          if (typeof metodoPago === 'string') {
                            const metodoStr = String(metodoPago);
                            return metodoStr.charAt(0).toUpperCase() + metodoStr.slice(1);
                          }
                          // Si es objeto, buscar propiedades
                          const metodoObj = metodoPago as any;
                          return metodoObj.nombre || metodoObj.tipo || 'Método personalizado';
                        }
                        return 'No disponible';
                      } catch {
                        return 'No disponible';
                      }
                    };

                    return (
                      <tr key={venta.idVenta} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {formatearFechaHora(venta.fechaVenta)}
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
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {obtenerMetodoPago()}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
          {/* Controles de paginación responsiva */}
          {(() => {
            const ventasOrdenadas = [...ventas].sort((a, b) => {
              const fechaA = parsearFechaVenta(a.fechaVenta);
              const fechaB = parsearFechaVenta(b.fechaVenta);
              return fechaB.getTime() - fechaA.getTime();
            });
            const totalPaginas = Math.ceil(ventasOrdenadas.length / ventasPorPagina);
            
            if (totalPaginas <= 1) return null;

            return (
              <div className="mt-6 bg-gray-50 border-t border-gray-200">
                {/* Versión móvil */}
                <div className="block sm:hidden px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                      disabled={paginaActual === 1}
                      className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                        paginaActual === 1 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </button>
                    
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-700 font-medium">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ventasOrdenadas.length} resultados
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                      disabled={paginaActual === totalPaginas}
                      className={`flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md ${
                        paginaActual === totalPaginas 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Versión desktop */}
                <div className="hidden sm:flex items-center justify-between px-4 py-3 sm:px-6">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">
                        {((paginaActual - 1) * ventasPorPagina) + 1}
                      </span>{' '}
                      a{' '}
                      <span className="font-medium">
                        {Math.min(paginaActual * ventasPorPagina, ventasOrdenadas.length)}
                      </span>{' '}
                      de{' '}
                      <span className="font-medium">{ventasOrdenadas.length}</span>{' '}
                      resultados
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                      disabled={paginaActual === 1}
                      className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const páginas = [];
                        if (totalPaginas <= 5) {
                          for (let i = 1; i <= totalPaginas; i++) {
                            páginas.push(
                              <button
                                key={i}
                                onClick={() => setPaginaActual(i)}
                                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                                  i === paginaActual
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                        } else {
                          páginas.push(
                            <button
                              key={1}
                              onClick={() => setPaginaActual(1)}
                              className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                                paginaActual === 1
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              1
                            </button>
                          );
                          let rangeStart = Math.max(2, paginaActual - 2);
                          let rangeEnd = Math.min(totalPaginas - 1, paginaActual + 2);
                          if (paginaActual <= 3) {
                            rangeStart = 2;
                            rangeEnd = 5;
                          } else if (paginaActual >= totalPaginas - 2) {
                            rangeStart = totalPaginas - 4;
                            rangeEnd = totalPaginas - 1;
                          }
                          if (rangeStart > 2) páginas.push(<span key="start-ellipsis" className="px-2 text-gray-400 select-none text-base">...</span>);
                          for (let i = rangeStart; i <= rangeEnd; i++) {
                            páginas.push(
                              <button
                                key={i}
                                onClick={() => setPaginaActual(i)}
                                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                                  i === paginaActual
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          if (rangeEnd < totalPaginas - 1) páginas.push(<span key="end-ellipsis" className="px-2 text-gray-400 select-none text-base">...</span>);
                          páginas.push(
                            <button
                              key={totalPaginas}
                              onClick={() => setPaginaActual(totalPaginas)}
                              className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${
                                paginaActual === totalPaginas
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {totalPaginas}
                            </button>
                          );
                        }
                        return páginas;
                      })()}
                    </div>
                    
                    <button
                      onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                      disabled={paginaActual === totalPaginas}
                      className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {ventas.length === 0 && !cargando && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay ventas en el período seleccionado</p>
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

export default ReporteDeVentas;
