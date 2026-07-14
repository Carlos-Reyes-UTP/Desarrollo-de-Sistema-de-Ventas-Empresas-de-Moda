import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { MaterialIcon, AlertModal, ChartSkeleton, PageActionButton } from '@/shared/ui';
import * as XLSX from 'xlsx';
import { VentaService } from '../../services/VentaService';
import type { Venta } from '../../types/Venta';
import type { DetalleVenta } from '../../types/DetalleVenta';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DatePickerPopover } from '@/components/reportes/shared/DatePickerPopover';
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

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const hoyIsoLocal = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const primerDiaMesIso = (iso: string) => `${iso.slice(0, 7)}-01`;

const ultimoDiaMesIso = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

const mismoMesIso = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

const fmtLabelDia = (d: Date) => {
  const mesCorto = d.toLocaleDateString('es-PE', { month: 'short' }).replace(/\.$/, '');
  return `${d.getDate()} ${mesCorto}`;
};

const parseIsoLocal = (iso: string, endOfDay = false) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const defaultsRangoMes = () => {
  const hoy = hoyIsoLocal();
  return { desde: primerDiaMesIso(hoy), hasta: hoy };
};

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
  const iniciales = defaultsRangoMes();
  const [fechaDesde, setFechaDesde] = useState(iniciales.desde);
  const [fechaHasta, setFechaHasta] = useState(iniciales.hasta);
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

  const chartForInsight = useMemo(
    () => datosGrafico.map((d) => ({ label: d.fecha, ventas: d.ventas })),
    [datosGrafico]
  );
  const picoInsight = useMemo(() => generarInsightPicoGrafico(chartForInsight), [chartForInsight]);

  const dayData = useMemo(
    () => buildDayDataFromVentas(ventas, parsearFechaVenta),
    [ventas]
  );

  const diasEnRango = useMemo(() => {
    const a = parseIsoLocal(fechaDesde).getTime();
    const b = parseIsoLocal(fechaHasta).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [fechaDesde, fechaHasta]);

  const mesBounds = useMemo(
    () => ({
      min: primerDiaMesIso(fechaDesde),
      max: ultimoDiaMesIso(fechaDesde),
    }),
    [fechaDesde]
  );

  const onCambiarDesde = (v: string) => {
    setFechaDesde(v);
    const maxMes = ultimoDiaMesIso(v);
    const minMes = primerDiaMesIso(v);
    setFechaHasta((prev) => {
      if (!mismoMesIso(prev, v)) {
        const hoy = hoyIsoLocal();
        if (mismoMesIso(hoy, v) && hoy >= v) return hoy <= maxMes ? hoy : maxMes;
        return maxMes;
      }
      if (prev < v) return v;
      if (prev > maxMes) return maxMes;
      if (prev < minMes) return minMes;
      return prev;
    });
  };

  const onCambiarHasta = (v: string) => {
    if (!mismoMesIso(v, fechaDesde)) {
      setFechaHasta(fechaDesde);
      return;
    }
    let next = v;
    if (next < fechaDesde) next = fechaDesde;
    if (next > mesBounds.max) next = mesBounds.max;
    setFechaHasta(next);
  };

  // Cargar datos al cambiar filtros
  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [fechaDesde, fechaHasta]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const fechaInicio = parseIsoLocal(fechaDesde, false);
      const fechaFin = parseIsoLocal(fechaHasta, true);

      const ventasFiltradas = await VentaService.obtenerTodasVentas(fechaDesde, fechaHasta);
      if (!Array.isArray(ventasFiltradas)) throw new Error('Respuesta inválida del servidor');

      setVentas(ventasFiltradas);
      procesarDatosGrafico(ventasFiltradas, fechaInicio, fechaFin);
      calcularResumenVentas(ventasFiltradas);
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const procesarDatosGrafico = (ventasList: Venta[], fechaInicio: Date, fechaFin: Date) => {
    const datos: ReporteData[] = [];
    const diaCursor = new Date(fechaInicio);
    diaCursor.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    while (diaCursor <= fin) {
      const diaFin = new Date(diaCursor);
      diaFin.setHours(23, 59, 59, 999);

      const ventasDia = ventasList.filter((venta) => {
        const fechaVenta = parsearFechaVenta(venta.fechaVenta);
        return fechaVenta && fechaVenta >= diaCursor && fechaVenta <= diaFin;
      });

      datos.push({
        fecha: fmtLabelDia(diaCursor),
        ventas: ventasDia.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
        cantidad: ventasDia.length,
      });

      diaCursor.setDate(diaCursor.getDate() + 1);
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
    const nombreArchivo = `reporte_ventas_${fechaDesde}_${fechaHasta}.xlsx`;

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
  }, [ventas, fechaDesde, fechaHasta]);

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

  const labelDesdeUi = (() => {
    try {
      return parseIsoLocal(fechaDesde).toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fechaDesde;
    }
  })();

  const labelHastaUi = (() => {
    try {
      return parseIsoLocal(fechaHasta).toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fechaHasta;
    }
  })();

  const mesTitulo = (() => {
    try {
      return parseIsoLocal(fechaDesde).toLocaleDateString('es-PE', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return fechaDesde.slice(0, 7);
    }
  })();

  return (
    <div className="report-ventas space-y-5">
      {/* 1. Hero: total + rango fecha→fecha (mismo mes) */}
      <section className="report-ventas-hero">
        <div className="report-ventas-hero__main">
          <p className="report-ventas-hero__eyebrow">Total del período</p>
          <p className="report-ventas-hero__amount tabular-nums">
            {cargando ? '—' : formatearMoneda(resumenVentas.totalVentas)}
          </p>
          <p className="report-ventas-hero__meta">
            {labelDesdeUi} → {labelHastaUi}
            {' · '}
            {resumenVentas.cantidadTransacciones} transacciones
            {' · '}
            Solo dentro de {mesTitulo}
          </p>
        </div>

        <div className="report-ventas-hero__controls report-ventas-hero__range">
          <div className="report-ventas-hero__datepicker">
            <DatePickerPopover
              label="Desde"
              value={fechaDesde}
              onChange={onCambiarDesde}
            />
          </div>
          <span className="report-ventas-hero__range-sep" aria-hidden>
            →
          </span>
          <div className="report-ventas-hero__datepicker">
            <DatePickerPopover
              label="Hasta"
              value={fechaHasta}
              onChange={onCambiarHasta}
              min={fechaDesde}
              max={mesBounds.max}
            />
          </div>
        </div>
      </section>

      {picoInsight ? (
        <div className="report-ventas-pulse" role="status">
          <MaterialIcon icon="bolt" className="w-4 h-4 shrink-0 text-[var(--app-accent)]" />
          <p>{picoInsight}</p>
        </div>
      ) : null}

      {/* 2. Split asimétrico: chart dominante + stack de métricas */}
      <div className="report-ventas-split">
        <div className="report-ventas-split__chart">
          {cargando ? (
            <ChartSkeleton height="h-[340px]" />
          ) : (
            <ReportTrendPanel
              chartPoints={chartForInsight}
              dayData={dayData}
              tituloGrafico="Ventas por día"
              subtitulo={`${labelDesdeUi} → ${labelHastaUi}`}
              serieLabel="Ventas por día"
              gradientId="areaGradVentas"
              showWeekdayDistribution={diasEnRango <= 7}
            />
          )}
        </div>

        <aside className="report-ventas-metrics" aria-label="Indicadores del período">
          <div className="report-ventas-metric">
            <span className="report-ventas-metric__label">Transacciones</span>
            <span className="report-ventas-metric__value tabular-nums">
              {resumenVentas.cantidadTransacciones.toLocaleString('es-PE')}
            </span>
          </div>
          <div className="report-ventas-metric">
            <span className="report-ventas-metric__label">Ticket promedio</span>
            <span className="report-ventas-metric__value tabular-nums">
              {formatearMoneda(resumenVentas.ticketPromedio)}
            </span>
          </div>
          <div className="report-ventas-metric">
            <span className="report-ventas-metric__label">Unidades</span>
            <span className="report-ventas-metric__value tabular-nums">
              {resumenVentas.productosVendidos.toLocaleString('es-PE')}
            </span>
          </div>
          <div className="report-ventas-metric report-ventas-metric--accent">
            <span className="report-ventas-metric__label">Ingresos</span>
            <span className="report-ventas-metric__value tabular-nums">
              {formatearMoneda(resumenVentas.totalVentas)}
            </span>
          </div>
        </aside>
      </div>

      {/* 3. Ledger de ventas */}
      <DashboardPanel className="report-ventas-ledger !p-0 overflow-hidden">
        <div className="report-ventas-ledger__head">
          <div>
            <p className="report-ventas-ledger__eyebrow">Registro</p>
            <h3 className="report-ventas-ledger__title">
              {ventas.length} venta{ventas.length === 1 ? '' : 's'}
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="report-ventas-table min-w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Cliente</th>
                <th className="text-right">Total</th>
                <th>Pago</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const ventasOrdenadas = ventas.toSorted((a, b) => {
                  const fechaA = parsearFechaVenta(a.fechaVenta);
                  const fechaB = parsearFechaVenta(b.fechaVenta);
                  return fechaB.getTime() - fechaA.getTime();
                });

                const indiceInicio = (paginaActual - 1) * ventasPorPagina;
                const indiceFin = indiceInicio + ventasPorPagina;
                const ventasPagina = ventasOrdenadas.slice(indiceInicio, indiceFin);

                if (!cargando && ventasPagina.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="report-ventas-table__empty">
                        No hay ventas en este período
                      </td>
                    </tr>
                  );
                }

                return ventasPagina.map((venta) => {
                  const formatearFechaHora = (fechaStr: string) => {
                    try {
                      const fecha = parsearFechaVenta(fechaStr);
                      if (isNaN(fecha.getTime())) return 'Fecha inválida';
                      return fecha.toLocaleString('es-PE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });
                    } catch {
                      return 'Error en fecha';
                    }
                  };

                  const obtenerMetodoPago = () => {
                    try {
                      const metodoPago = venta.metodoPago;
                      if (metodoPago) {
                        if (typeof metodoPago === 'string') {
                          const metodoStr = String(metodoPago);
                          return metodoStr.charAt(0).toUpperCase() + metodoStr.slice(1);
                        }
                        return metodoPago.nombre || metodoPago.tipo || 'Método personalizado';
                      }
                      return 'No disponible';
                    } catch {
                      return 'No disponible';
                    }
                  };

                  return (
                    <tr key={venta.idVenta}>
                      <td className="font-mono text-[13px]">{formatearFechaHora(venta.fechaVenta)}</td>
                      <td>{venta.usuario?.usuario || '—'}</td>
                      <td>{venta.cliente?.nombreCliente || 'Cliente general'}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatearMoneda(venta.totalVentas || 0)}
                      </td>
                      <td>
                        <span className="report-ventas-pay">{obtenerMetodoPago()}</span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {(() => {
          const ventasOrdenadas = ventas.toSorted((a, b) => {
            const fechaA = parsearFechaVenta(a.fechaVenta);
            const fechaB = parsearFechaVenta(b.fechaVenta);
            return fechaB.getTime() - fechaA.getTime();
          });
          const totalPaginas = Math.ceil(ventasOrdenadas.length / ventasPorPagina);

          if (totalPaginas <= 1) return null;

          return (
            <div className="report-pagination-bar report-ventas-ledger__pager">
              <div className="block sm:hidden px-3 py-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    className="report-pagination-btn"
                  >
                    <MaterialIcon icon="chevron_left" className="h-4 w-4 mr-1" />
                    Anterior
                  </button>

                  <span className="text-sm app-heading font-medium">
                    {paginaActual} / {totalPaginas}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    className="report-pagination-btn"
                  >
                    Siguiente
                    <MaterialIcon icon="chevron_right" className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-between px-4 py-3 sm:px-5">
                <p className="text-sm app-text-muted">
                  {(paginaActual - 1) * ventasPorPagina + 1}–
                  {Math.min(paginaActual * ventasPorPagina, ventasOrdenadas.length)} de{' '}
                  {ventasOrdenadas.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    className="report-pagination-btn"
                  >
                    <MaterialIcon icon="chevron_left" className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-bold tabular-nums app-heading px-2">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    className="report-pagination-btn"
                  >
                    <MaterialIcon icon="chevron_right" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </DashboardPanel>

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
