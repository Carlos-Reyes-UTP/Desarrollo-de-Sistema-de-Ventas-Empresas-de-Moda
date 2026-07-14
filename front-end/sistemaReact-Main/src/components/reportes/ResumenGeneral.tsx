import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { ReporteService } from '@/services/ReporteService';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { ReporteCategoriaData } from '@/types/ReporteVentas';
import { AlertModal, ChartSkeleton, PageActionButton } from '@/shared/ui';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { ReportCategoryBreakdown } from '@/components/reportes/layout/ReportCategoryBreakdown';
import { ReportDriverCards } from '@/components/reportes/layout/ReportDriverCards';
import { ReportSignalMatrix } from '@/components/reportes/layout/ReportSignalMatrix';
import { ReportSignalPanel } from '@/components/reportes/layout/ReportSignalPanel';
import { ReportTrendPanel } from '@/components/reportes/layout/ReportTrendPanel';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';
import { ReportCompareMonthsChart } from '@/components/reportes/layout/ReportCompareMonthsChart';
import {
  calcularMetricasComparacionPeriodo,
  filtrarVentasEnRango,
  filtrarVentasPorPeriodo,
  procesarDatosGraficoPorPeriodo,
  rangoPeriodoAnterior,
  tituloGraficoPeriodo,
} from '@/utils/dashboardPeriodo';
import { generarInsightsResumen } from '@/utils/reportInsights';
import {
  compararMeses,
  etiquetaMesUi,
  pctCrecimientoComparar,
  type ResultadoCompararMeses,
} from '@/utils/reportesCompararMeses';
import { buildSignalFromCompareDeltas, buildSignalFromScore } from '@/utils/reportSignal';

interface ResumenVentasLocal {
  totalVentas: number;
  totalOrdenes: number;
  clientesActivos: number;
  ticketPromedio: number;
  productosVendidos: number;
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoClientes: number;
  crecimientoTicket: number;
  crecimientoProductos: number;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const contarProductosVendidos = (ventas: Venta[]) =>
  ventas.reduce((sum, v) => {
    if (v.detalles?.length) return sum + v.detalles.reduce((d, det) => d + det.cantidad, 0);
    return sum;
  }, 0);

const buildDayData = (ventas: Venta[]) => {
  const totals = new Array(7).fill(0);
  ventas.forEach((v) => {
    try {
      const d = new Date(v.fechaVenta);
      if (!isNaN(d.getTime())) totals[d.getDay()] += v.totalVentas || 0;
    } catch {
      /* noop */
    }
  });
  return DIAS.map((d, i) => ({ dia: d, ventas: totals[i] }));
};

const ResumenGeneral: React.FC = () => {
  const {
    periodo,
    etiqueta,
    filtrosFecha,
    modo,
    mesBase,
    mesComparar,
    mesesIguales,
  } = useReportPeriodContext();
  const { setActions } = useReportPageActions();
  const [resumen, setResumen] = useState<ResumenVentasLocal | null>(null);
  const [chartPoints, setChartPoints] = useState<Array<{ label: string; ventas: number }>>([]);
  const [allVentas, setAllVentas] = useState<Venta[]>([]);
  const [comparativa, setComparativa] = useState<ResultadoCompararMeses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    message: string;
    variant: 'error' | 'info' | 'success';
  }>({ open: false, message: '', variant: 'info' });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fechaInicioExt: string;
      let fechaFinExt: string;

      if (modo === 'comparar') {
        fechaInicioExt = filtrosFecha.fechaInicio!;
        fechaFinExt = filtrosFecha.fechaFin!;
      } else {
        const { inicio: inicioAnterior } = rangoPeriodoAnterior(periodo);
        fechaInicioExt = inicioAnterior.toISOString().split('T')[0];
        fechaFinExt = filtrosFecha.fechaFin!;
      }

      const todasLasVentas = await VentaService.obtenerTodasVentas(fechaInicioExt, fechaFinExt);
      if (!Array.isArray(todasLasVentas)) throw new Error('No se pudieron obtener datos de ventas');

      const ventas = todasLasVentas as Venta[];
      setAllVentas(ventas);

      if (modo === 'comparar') {
        const cmp = compararMeses(ventas, mesBase, mesComparar);
        setComparativa(cmp);

        if (cmp.invalidSameMonth) {
          setResumen(null);
          setChartPoints([]);
        } else {
          setResumen({
            totalVentas: cmp.comparar.totalVentas,
            totalOrdenes: cmp.comparar.totalOrdenes,
            clientesActivos: cmp.comparar.clientesActivos,
            ticketPromedio: cmp.comparar.ticketPromedio,
            productosVendidos: cmp.comparar.productosVendidos,
            crecimientoVentas: cmp.deltas.crecimientoVentas,
            crecimientoOrdenes: cmp.deltas.crecimientoOrdenes,
            crecimientoClientes: cmp.deltas.crecimientoClientes,
            crecimientoTicket: cmp.deltas.crecimientoTicket,
            crecimientoProductos: cmp.deltas.crecimientoProductos,
          });
          setChartPoints([]);
        }
      } else {
        setComparativa(null);
        const ventasPeriodo = filtrarVentasPorPeriodo(ventas, periodo);
        const totalVentas = ventasPeriodo.reduce((sum, v) => sum + (v.totalVentas || 0), 0);
        const totalOrdenes = ventasPeriodo.length;
        const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
        const productosVendidos = contarProductosVendidos(ventasPeriodo);

        const clientesUnicos = new Set(
          ventasPeriodo.map((v) => v.cliente?.idCliente).filter((id) => id !== undefined)
        ).size;

        const comparacion = calcularMetricasComparacionPeriodo(ventas, periodo);
        const { inicio, fin } = rangoPeriodoAnterior(periodo);
        const productosAnterior = contarProductosVendidos(filtrarVentasEnRango(ventas, inicio, fin));

        setResumen({
          totalVentas,
          totalOrdenes,
          clientesActivos: clientesUnicos,
          ticketPromedio,
          productosVendidos,
          crecimientoVentas: comparacion.crecimientoVentas,
          crecimientoOrdenes: comparacion.crecimientoOrdenes,
          crecimientoClientes: comparacion.crecimientoClientes,
          crecimientoTicket: comparacion.crecimientoTicket,
          crecimientoProductos: pctCrecimientoComparar(productosVendidos, productosAnterior),
        });

        setChartPoints(procesarDatosGraficoPorPeriodo(ventasPeriodo, periodo));
      }
    } catch (err) {
      console.error('Error al cargar resumen general:', err);
      setError('Error al cargar el resumen general. Intenta nuevamente.');
      setResumen({
        totalVentas: 0,
        totalOrdenes: 0,
        clientesActivos: 0,
        ticketPromedio: 0,
        productosVendidos: 0,
        crecimientoVentas: 0,
        crecimientoOrdenes: 0,
        crecimientoClientes: 0,
        crecimientoTicket: 0,
        crecimientoProductos: 0,
      });
      setChartPoints([]);
      setComparativa(null);
    } finally {
      setLoading(false);
    }
  }, [periodo, modo, mesBase, mesComparar, filtrosFecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const [categoriasVentas, setCategoriasVentas] = useState<ReporteCategoriaData[]>([]);
  const [extraInsights, setExtraInsights] = useState<{
    topCategoria?: { nombre: string; porcentaje: number };
    topProducto?: { nombre: string; sharePct: number };
    metodoPagoDominante?: { nombre: string; porcentaje: number };
  }>({});

  useEffect(() => {
    if (modo === 'comparar') {
      setCategoriasVentas([]);
      setExtraInsights({});
      return;
    }

    let cancelled = false;
    const loadExtra = async () => {
      try {
        const [categorias, productos, ventas] = await Promise.all([
          ReporteService.getReportePorCategoria(filtrosFecha),
          ReporteService.getProductosMasVendidos({ ...filtrosFecha, limite: 10 }),
          VentaService.obtenerTodasVentas(filtrosFecha.fechaInicio, filtrosFecha.fechaFin),
        ]);
        if (cancelled) return;

        setCategoriasVentas(Array.isArray(categorias) ? categorias : []);

        const topCat = categorias?.length
          ? (() => {
              const total = categorias.reduce((s, c) => s + Number(c.ingresosTotales || 0), 0);
              const top = [...categorias].sort(
                (a, b) => Number(b.ingresosTotales) - Number(a.ingresosTotales)
              )[0];
              return total > 0
                ? { nombre: top.categoria, porcentaje: (Number(top.ingresosTotales) / total) * 100 }
                : undefined;
            })()
          : undefined;

        const totalUnidades = productos?.reduce((s, p) => s + p.cantidadVendida, 0) ?? 0;
        const topProd =
          productos?.length && totalUnidades > 0
            ? (() => {
                const top = [...productos].sort((a, b) => b.cantidadVendida - a.cantidadVendida)[0];
                return { nombre: top.nombreProducto, sharePct: (top.cantidadVendida / totalUnidades) * 100 };
              })()
            : undefined;

        const ventasFiltradas = Array.isArray(ventas)
          ? filtrarVentasPorPeriodo(ventas as Venta[], periodo)
          : [];
        const pagos = new Map<string, number>();
        for (const v of ventasFiltradas) {
          const mpRaw = v.metodoPago;
          const mp =
            typeof mpRaw === 'string'
              ? mpRaw
              : (mpRaw as { nombreMetodo?: string; descripcion?: string })?.nombreMetodo ||
                (mpRaw as { idMetodoPago?: number })?.idMetodoPago?.toString() ||
                'Otro';
          pagos.set(mp, (pagos.get(mp) ?? 0) + 1);
        }
        let metodoPagoDominante: { nombre: string; porcentaje: number } | undefined;
        if (pagos.size && ventasFiltradas.length) {
          const sorted = [...pagos.entries()].sort((a, b) => b[1] - a[1]);
          metodoPagoDominante = {
            nombre: sorted[0][0],
            porcentaje: (sorted[0][1] / ventasFiltradas.length) * 100,
          };
        }

        setExtraInsights({ topCategoria: topCat, topProducto: topProd, metodoPagoDominante });
      } catch {
        if (!cancelled) {
          setExtraInsights({});
          setCategoriasVentas([]);
        }
      }
    };
    loadExtra();
    return () => {
      cancelled = true;
    };
  }, [periodo, filtrosFecha, modo]);

  const insights = useMemo(() => {
    if (!resumen || modo === 'comparar') return null;
    return generarInsightsResumen({ ...resumen, ...extraInsights, chartPoints });
  }, [resumen, extraInsights, chartPoints, modo]);

  const signal = useMemo(() => {
    if (modo === 'comparar' && comparativa && !comparativa.invalidSameMonth) {
      return buildSignalFromCompareDeltas({
        crecimientoVentas: comparativa.deltas.crecimientoVentas,
        crecimientoOrdenes: comparativa.deltas.crecimientoOrdenes,
        crecimientoTicket: comparativa.deltas.crecimientoTicket,
        etiquetaBase: comparativa.etiquetaBase,
        etiquetaComparar: comparativa.etiquetaComparar,
      });
    }
    if (!resumen || !insights) return null;
    return buildSignalFromScore({
      score: insights.score,
      headline: insights.headline,
      crecimientoVentas: resumen.crecimientoVentas,
      crecimientoOrdenes: resumen.crecimientoOrdenes,
      crecimientoTicket: resumen.crecimientoTicket,
      leadDeltaPct: resumen.crecimientoVentas,
      leadDeltaLabel: 'Ingresos',
    });
  }, [modo, comparativa, resumen, insights]);

  const dayData = useMemo(() => {
    if (modo === 'comparar') return buildDayData([]);
    const delPeriodo = filtrarVentasPorPeriodo(allVentas, periodo);
    return buildDayData(delPeriodo);
  }, [allVentas, modo, periodo]);

  const hayVentasComparar = useMemo(() => {
    if (modo !== 'comparar' || !comparativa || comparativa.invalidSameMonth) return true;
    return (
      comparativa.base.totalOrdenes > 0 ||
      comparativa.comparar.totalOrdenes > 0 ||
      comparativa.base.totalVentas > 0 ||
      comparativa.comparar.totalVentas > 0
    );
  }, [modo, comparativa]);

  const exportarAExcel = useCallback(async () => {
    if (!resumen && !(modo === 'comparar' && comparativa && !comparativa.invalidSameMonth)) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    let loadingToast: HTMLDivElement | null = null;
    try {
      loadingToast = document.createElement('div');
      loadingToast.className =
        'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      loadingToast.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generando resumen ejecutivo...</span>
      `;
      document.body.appendChild(loadingToast);

      const workbook = XLSX.utils.book_new();

      let resumenData: (string | number)[][];
      if (modo === 'comparar' && comparativa && !comparativa.invalidSameMonth) {
        resumenData = [
          ['RESUMEN EJECUTIVO — COMPARAR MESES', '', '', ''],
          ['Modo', 'Comparar meses', '', ''],
          ['Mes base', comparativa.etiquetaBase, '', ''],
          ['Comparar con', comparativa.etiquetaComparar, '', ''],
          ['', '', '', ''],
          ['Métrica', 'Mes base', 'Comparar con', 'Crecimiento %'],
          [
            'Ingresos',
            comparativa.base.totalVentas,
            comparativa.comparar.totalVentas,
            comparativa.deltas.crecimientoVentas,
          ],
          [
            'Transacciones',
            comparativa.base.totalOrdenes,
            comparativa.comparar.totalOrdenes,
            comparativa.deltas.crecimientoOrdenes,
          ],
          [
            'Ticket Promedio',
            comparativa.base.ticketPromedio,
            comparativa.comparar.ticketPromedio,
            comparativa.deltas.crecimientoTicket,
          ],
          [
            'Clientes activos',
            comparativa.base.clientesActivos,
            comparativa.comparar.clientesActivos,
            comparativa.deltas.crecimientoClientes,
          ],
          [
            'Unidades',
            comparativa.base.productosVendidos,
            comparativa.comparar.productosVendidos,
            comparativa.deltas.crecimientoProductos,
          ],
          ['', '', '', ''],
          ['Señal', signal?.label ?? comparativa.insight, '', ''],
          ['Delta ingresos %', comparativa.deltas.crecimientoVentas, '', ''],
          ['Insight', comparativa.insight, '', ''],
        ];
      } else if (resumen) {
        resumenData = [
          ['RESUMEN EJECUTIVO', '', '', ''],
          ['Modo', 'Vista simple', '', ''],
          ['Período', etiqueta, '', ''],
          ['', '', '', ''],
          ['Métrica', 'Valor', 'Crecimiento % vs período anterior', ''],
          ['Ingresos', resumen.totalVentas, resumen.crecimientoVentas, ''],
          ['Transacciones', resumen.totalOrdenes, resumen.crecimientoOrdenes, ''],
          ['Ticket Promedio', resumen.ticketPromedio, resumen.crecimientoTicket, ''],
          ['Productos vendidos (uds)', resumen.productosVendidos, resumen.crecimientoProductos, ''],
        ];
        if (insights) {
          resumenData.push(['', '', '', '']);
          resumenData.push(['Índice salud comercial', insights.score, '', '']);
        }
        if (categoriasVentas.length) {
          resumenData.push(['', '', '', '']);
          resumenData.push(['Categoría', 'Ingresos (S/)', 'Unidades', '']);
          categoriasVentas.forEach((c) => {
            resumenData.push([
              c.categoria,
              Number(c.ingresosTotales || 0),
              c.cantidadTotalVendida,
              '',
            ]);
          });
        }
      } else {
        throw new Error('Sin datos');
      }

      const ws = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Resumen Ejecutivo');
      const suffix =
        modo === 'comparar'
          ? `comparar-${etiquetaMesUi(mesBase).replace(/\s+/g, '-')}-vs-${etiquetaMesUi(mesComparar).replace(/\s+/g, '-')}`
          : `rapido-${periodo}`;
      XLSX.writeFile(workbook, `resumen-general-${suffix}-${new Date().toISOString().split('T')[0]}.xlsx`);

      if (loadingToast && document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast);
      }

      const successToast = document.createElement('div');
      successToast.className =
        'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      successToast.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Resumen exportado exitosamente</span>
      `;
      document.body.appendChild(successToast);

      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 3000);
    } catch (exportError) {
      console.error('Error al exportar datos:', exportError);

      if (loadingToast && document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast);
      }

      setAlertModal({ open: true, message: 'Error al exportar Excel', variant: 'error' });
    }
  }, [
    resumen,
    etiqueta,
    insights,
    signal,
    categoriasVentas,
    modo,
    comparativa,
    mesBase,
    mesComparar,
    periodo,
  ]);

  useEffect(() => {
    setActions(
      <PageActionButton
        onClick={exportarAExcel}
        disabled={loading || (modo === 'comparar' ? mesesIguales || !comparativa : !resumen)}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Exportar Excel
      </PageActionButton>
    );
  }, [setActions, exportarAExcel, loading, resumen, modo, mesesIguales, comparativa]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="report-signal-fold" aria-busy="true">
          <div className="report-signal-skeleton" />
          <div className="report-signal-matrix">
            <div className="report-signal-skeleton" />
            <div className="report-signal-skeleton" />
            <div className="report-signal-skeleton" />
            <div className="report-signal-skeleton" />
          </div>
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-panel rounded-2xl border p-4 border-[color-mix(in_srgb,var(--app-metric-icon-5-fg)_40%,var(--app-border))]">
        <p className="text-sm font-bold text-[var(--app-metric-icon-5-fg)] mb-3">{error}</p>
        <PageActionButton onClick={cargarDatos}>Reintentar</PageActionButton>
      </div>
    );
  }

  if (modo === 'comparar' && (mesesIguales || comparativa?.invalidSameMonth)) {
    return (
      <div className="space-y-6">
        <ReportInsightBanner
          headline="Elige dos meses distintos"
          message="Usa Base y Actual en la barra superior, o el botón de invertir."
          icon="tune"
        />
        <AlertModal
          open={alertModal.open}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
        />
      </div>
    );
  }

  if (modo === 'comparar' && comparativa && !hayVentasComparar) {
    return (
      <div className="space-y-6">
        <ReportInsightBanner
          headline="Sin ventas en estos meses"
          message={`No hay ventas registradas en ${comparativa.etiquetaBase} ni en ${comparativa.etiquetaComparar}. Prueba con otros meses.`}
          icon="inventory_2"
        />
        <AlertModal
          open={alertModal.open}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
        />
      </div>
    );
  }

  if (
    modo !== 'comparar' &&
    resumen &&
    resumen.totalOrdenes === 0 &&
    resumen.totalVentas === 0
  ) {
    return (
      <div className="space-y-6">
        <ReportInsightBanner
          headline="Sin ventas en el periodo"
          message={`No hay ventas registradas en ${etiqueta}. Prueba eligiendo otro período en la barra superior.`}
          icon="inventory_2"
        />
        <AlertModal
          open={alertModal.open}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
        />
      </div>
    );
  }

  if (!resumen || !signal || (modo !== 'comparar' && !insights)) {
    return (
      <div className="app-panel rounded-2xl border p-4">
        <p className="text-sm app-text-muted">No hay datos disponibles para el período seleccionado.</p>
      </div>
    );
  }

  const etiquetaLower = etiqueta.toLowerCase();

  const matrixCells =
    modo === 'comparar' && comparativa
      ? [
          {
            id: 'ing',
            label: 'Ingresos',
            value: comparativa.comparar.totalVentas,
            baseValue: comparativa.base.totalVentas,
            baseLabel: comparativa.etiquetaBase,
            deltaPct: comparativa.deltas.crecimientoVentas,
            format: 'moneda' as const,
          },
          {
            id: 'ord',
            label: 'Ventas',
            value: comparativa.comparar.totalOrdenes,
            baseValue: comparativa.base.totalOrdenes,
            baseLabel: comparativa.etiquetaBase,
            deltaPct: comparativa.deltas.crecimientoOrdenes,
            format: 'entero' as const,
          },
          {
            id: 'tkt',
            label: 'Ticket prom.',
            value: comparativa.comparar.ticketPromedio,
            baseValue: comparativa.base.ticketPromedio,
            baseLabel: comparativa.etiquetaBase,
            deltaPct: comparativa.deltas.crecimientoTicket,
            format: 'moneda' as const,
          },
          {
            id: 'uni',
            label: 'Unidades',
            value: comparativa.comparar.productosVendidos,
            baseValue: comparativa.base.productosVendidos,
            baseLabel: comparativa.etiquetaBase,
            deltaPct: comparativa.deltas.crecimientoProductos,
            format: 'entero' as const,
          },
        ]
      : [
          {
            id: 'ing',
            label: 'Ingresos',
            value: resumen.totalVentas,
            deltaPct: resumen.crecimientoVentas,
            format: 'moneda' as const,
          },
          {
            id: 'ord',
            label: 'Ventas',
            value: resumen.totalOrdenes,
            deltaPct: resumen.crecimientoOrdenes,
            format: 'entero' as const,
          },
          {
            id: 'tkt',
            label: 'Ticket prom.',
            value: resumen.ticketPromedio,
            deltaPct: resumen.crecimientoTicket,
            format: 'moneda' as const,
          },
          {
            id: 'uni',
            label: 'Unidades',
            value: resumen.productosVendidos,
            deltaPct: resumen.crecimientoProductos,
            format: 'entero' as const,
          },
        ];

  return (
    <div className="space-y-5">
      <div className="report-signal-fold">
        <ReportSignalPanel
          signal={signal}
          deltaVsLabel={modo === 'comparar' ? 'mes base' : undefined}
        />
        <ReportSignalMatrix
          deltaVsLabel={modo === 'comparar' ? 'mes base' : 'ant.'}
          cells={matrixCells}
        />
      </div>

      {modo === 'comparar' && comparativa ? (
        <ReportCompareMonthsChart
          data={comparativa.chartSerie}
          etiquetaBase={comparativa.etiquetaBase}
          etiquetaComparar={comparativa.etiquetaComparar}
          insight={comparativa.insight}
        />
      ) : (
        <>
          {insights && insights.drivers.length > 0 ? (
            <ReportDriverCards drivers={insights.drivers} />
          ) : null}

          <ReportTrendPanel
            chartPoints={chartPoints}
            dayData={dayData}
            tituloGrafico="Ritmo de ingresos"
            subtitulo={`Tendencia ${etiquetaLower}`}
            gradientId="areaGradResumen"
            serieLabel={`${tituloGraficoPeriodo(periodo)} — ${new Date().getFullYear()}`}
          />

          <ReportCategoryBreakdown categorias={categoriasVentas} />
        </>
      )}

      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ open: false, message: '', variant: 'info' })}
      />
    </div>
  );
};

export default ResumenGeneral;
