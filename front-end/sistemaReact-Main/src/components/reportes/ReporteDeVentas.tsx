import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { MaterialIcon, AlertModal, ChartSkeleton, PageActionButton, SectionHeader } from '@/shared/ui';
import * as XLSX from 'xlsx';
import { VentaService } from '../../services/VentaService';
import type { Venta } from '../../types/Venta';
import type { DetalleVenta } from '../../types/DetalleVenta';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';
import { ReportTrendPanel } from '@/components/reportes/layout/ReportTrendPanel';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { generarInsightPicoGrafico } from '@/utils/reportInsights';

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

const OPCIONES_PERIODO: Array<{ value: TipoPeriodo; label: string }> = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];

const SEMANAS = [1, 2, 3, 4, 5];

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const buildDayDataFromVentas = (ventasList: Venta[], parsear: (s: string) => Date) => {
  const totalesDia = new Array(7).fill(0);
  ventasList.forEach((v) => {
    try {
      const d = parsear(v.fechaVenta);
      if (!isNaN(d.getTime())) totalesDia[d.getDay()] += v.totalVentas || 0;
    } catch {
      /* noop */
    }
  });
  return DIAS_SEMANA.map((dia, i) => ({ dia, ventas: totalesDia[i] }));
};

const ReporteDeVentas: React.FC = () => {
  const { setActions } = useReportPageActions();
  const [periodo, setPeriodo] = useState<TipoPeriodo>('mensual');
  const [isPeriodoOpen, setIsPeriodoOpen] = useState(false);
  const periodoRef = useRef<HTMLDivElement>(null);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1);
  const [isSemanaOpen, setIsSemanaOpen] = useState(false);
  const semanaRef = useRef<HTMLDivElement>(null);
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

  // Reset week on new data load
  useEffect(() => {
    setSemanaSeleccionada(1);
  }, [ventas]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) {
        setIsPeriodoOpen(false);
      }
      if (semanaRef.current && !semanaRef.current.contains(e.target as Node)) {
        setIsSemanaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chartForInsight = useMemo(
    () => datosGrafico.map((d) => ({ label: d.fecha, ventas: d.ventas })),
    [datosGrafico]
  );
  const picoInsight = useMemo(() => generarInsightPicoGrafico(chartForInsight), [chartForInsight]);
  const ventasParaDayData = useMemo(() => {
    if (periodo !== 'mensual') return ventas;
    return ventas.filter(v => {
      const d = parsearFechaVenta(v.fechaVenta);
      return Math.ceil(d.getDate() / 7) === semanaSeleccionada;
    });
  }, [ventas, periodo, semanaSeleccionada]);

  const dayData = useMemo(
    () => buildDayDataFromVentas(ventasParaDayData, parsearFechaVenta),
    [ventasParaDayData]
  );

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

      // Obtener ventas filtradas por rango desde el backend
      const fmtDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const ventasFiltradas = await VentaService.obtenerTodasVentas(fmtDate(fechaInicio), fmtDate(fechaFin));
      if (!Array.isArray(ventasFiltradas)) throw new Error('Respuesta inválida del servidor');

      console.log('✅ Ventas obtenidas para el período:', ventasFiltradas.length);

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

  const exportarAExcel = useCallback(async () => {
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
          const detalleRecord = detalle as DetalleVenta & { producto?: { nombre?: string } };
          const nombreProducto = detalleRecord.producto?.nombre || detalle.productoVariante?.producto?.nombre || 'Producto sin nombre';
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
  }, [ventas, periodo, fechaReferencia]);

  useEffect(() => {
    setActions(
      <PageActionButton onClick={exportarAExcel} disabled={cargando || ventas.length === 0}>
        <MaterialIcon icon="download" className="w-4 h-4" />
        Exportar Excel
      </PageActionButton>
    );
  }, [setActions, exportarAExcel, cargando, ventas.length]);

  const formatearMoneda = (valor: number) => {
    return formatterMonedaPE.format(valor);
  };

  const tituloGrafico =
    periodo === 'diario' ? 'Ventas por hora' : periodo === 'semanal' ? 'Ventas por día' : 'Ventas por semana';

  return (
    <div className="space-y-6">
      <DashboardPanel className="!p-5 sm:!p-6 relative z-10">
        <h3 className="text-base font-black app-heading mb-4">Filtros de Búsqueda</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
             <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Periodo
            </label>
            <div className="relative" ref={periodoRef}>
              <div
                onClick={() => setIsPeriodoOpen(!isPeriodoOpen)}
                className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">
                  {OPCIONES_PERIODO.find(p => p.value === periodo)?.label}
                </span>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {isPeriodoOpen && (
                <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-2 animate-fadeIn">
                  {OPCIONES_PERIODO.map(op => (
                    <button
                      key={op.value}
                      onClick={() => { setPeriodo(op.value); setIsPeriodoOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        periodo === op.value
                          ? 'bg-app-accent text-app-accent-fg'
                          : 'hover:bg-app-hover-overlay text-app-text'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="fecha-referencia" className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Fecha de referencia
            </label>
            <input
              id="fecha-referencia"
              type="date"
              value={fechaReferencia}
              onChange={(e) => setFechaReferencia(e.target.value)}
              className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)]"
            />
          </div>
        </div>
      </DashboardPanel>

      {picoInsight ? (
        <ReportInsightBanner message={picoInsight} headline="Concentración del período" icon="show_chart" />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardMetricCard label="Total ventas" value={formatearMoneda(resumenVentas.totalVentas)} icon="payments" iconIndex={1} />
        <DashboardMetricCard label="Transacciones" value={resumenVentas.cantidadTransacciones} icon="receipt_long" iconIndex={2} />
        <DashboardMetricCard label="Ticket promedio" value={formatearMoneda(resumenVentas.ticketPromedio)} icon="trending_up" iconIndex={3} />
        <DashboardMetricCard label="Unidades" value={resumenVentas.productosVendidos} icon="checkroom" iconIndex={4} />
      </div>

      {cargando ? (
        <ChartSkeleton height="h-[360px]" />
      ) : (
        <ReportTrendPanel
          chartPoints={chartForInsight}
          dayData={dayData}
          tituloGrafico="Ritmo de ventas"
          subtitulo={`${tituloGrafico} · referencia ${fechaReferencia}`}
          serieLabel={tituloGrafico}
          gradientId="areaGradVentas"
          weekSelector={periodo === 'mensual' ? (
            <div className="relative" ref={semanaRef}>
              <div
                onClick={() => setIsSemanaOpen(!isSemanaOpen)}
                className="bg-app-input text-app-text rounded-xl py-1.5 px-3 text-[11px] font-bold border border-[var(--app-border)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Semana {semanaSeleccionada}</span>
                <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {isSemanaOpen && (
                <div className="absolute z-50 right-0 mt-1.5 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-1.5 animate-fadeIn min-w-[120px]">
                  {SEMANAS.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSemanaSeleccionada(s); setIsSemanaOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                        semanaSeleccionada === s
                          ? 'bg-app-accent text-app-accent-fg'
                          : 'hover:bg-app-hover-overlay text-app-text'
                      }`}
                    >
                      Semana {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : undefined}
        />
      )}

      <DashboardPanel>
        <SectionHeader
          title={`Últimas ventas (${ventas.length})`}
        />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-bg-muted)]">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">
                    Método Pago
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {(() => {
                  // Ordenar las ventas por fecha más reciente primero
                  const ventasOrdenadas = ventas.toSorted((a, b) => {
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
                          // Si es objeto MetodoPago, acceder a sus propiedades directamente
                          return metodoPago.nombre || metodoPago.tipo || 'Método personalizado';
                        }
                        return 'No disponible';
                      } catch {
                        return 'No disponible';
                      }
                    };

                    return (
                      <tr key={venta.idVenta} className="hover:bg-[var(--app-bg-muted)]/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm app-heading font-mono">
                          {formatearFechaHora(venta.fechaVenta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm app-heading">
                          {venta.usuario?.usuario || 'No disponible'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm app-heading">
                          {venta.cliente?.nombreCliente || 'Cliente general'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium app-heading tabular-nums">
                          {formatearMoneda(venta.totalVentas || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm app-heading">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-[color-mix(in_srgb,var(--app-accent)_15%,transparent)] text-[var(--app-accent)]">
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
            const ventasOrdenadas = ventas.toSorted((a, b) => {
              const fechaA = parsearFechaVenta(a.fechaVenta);
              const fechaB = parsearFechaVenta(b.fechaVenta);
              return fechaB.getTime() - fechaA.getTime();
            });
            const totalPaginas = Math.ceil(ventasOrdenadas.length / ventasPorPagina);
            
            if (totalPaginas <= 1) return null;

            return (
              <div className="mt-6 report-pagination-bar">
                <div className="block sm:hidden px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                      disabled={paginaActual === 1}
                      className="report-pagination-btn"
                    >
                      <MaterialIcon icon="chevron_left" className="h-4 w-4 mr-1" />
                      Anterior
                    </button>
                    
                    <div className="flex flex-col items-center">
                      <span className="text-sm app-heading font-medium">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <span className="text-xs app-text-muted">
                        {ventasOrdenadas.length} resultados
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                      disabled={paginaActual === totalPaginas}
                      className="report-pagination-btn"
                    >
                      Siguiente
                      <MaterialIcon icon="chevron_right" className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-between px-4 py-3 sm:px-6">
                  <div className="flex items-center">
                    <p className="text-sm app-text-muted">
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
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                      disabled={paginaActual === 1}
                      className="report-pagination-btn"
                    >
                      <MaterialIcon icon="chevron_left" className="h-4 w-4" />
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
                                className={`report-pagination-btn ${i === paginaActual ? 'report-pagination-btn--active' : ''}`}
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
                              className={`report-pagination-btn ${paginaActual === 1 ? 'report-pagination-btn--active' : ''}`}
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
                          if (rangeStart > 2) páginas.push(<span key="start-ellipsis" className="px-2 app-text-faint select-none text-base">...</span>);
                          for (let i = rangeStart; i <= rangeEnd; i++) {
                            páginas.push(
                              <button
                                key={i}
                                onClick={() => setPaginaActual(i)}
                                className={`report-pagination-btn ${i === paginaActual ? 'report-pagination-btn--active' : ''}`}
                              >
                                {i}
                              </button>
                            );
                          }
                          if (rangeEnd < totalPaginas - 1) páginas.push(<span key="end-ellipsis" className="px-2 app-text-faint select-none text-base">...</span>);
                          páginas.push(
                            <button
                              key={totalPaginas}
                              onClick={() => setPaginaActual(totalPaginas)}
                              className={`report-pagination-btn ${paginaActual === totalPaginas ? 'report-pagination-btn--active' : ''}`}
                            >
                              {totalPaginas}
                            </button>
                          );
                        }
                        return páginas;
                      })()}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                      disabled={paginaActual === totalPaginas}
                      className="report-pagination-btn"
                    >
                      Siguiente
                      <MaterialIcon icon="chevron_right" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {ventas.length === 0 && !cargando && (
            <div className="text-center py-8">
              <p className="app-text-muted">No hay ventas en el período seleccionado</p>
            </div>
          )}
      </DashboardPanel>

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
