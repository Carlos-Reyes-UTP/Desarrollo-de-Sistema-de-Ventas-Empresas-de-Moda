import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { ReporteService } from '@/services/ReporteService';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { ReporteCategoriaData } from '@/types/ReporteVentas';
import { AlertModal, ChartSkeleton, MetricCardsSkeleton, PageActionButton } from '@/shared/ui';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { ReportCategoryBreakdown } from '@/components/reportes/layout/ReportCategoryBreakdown';
import { ReportDriverCards } from '@/components/reportes/layout/ReportDriverCards';
import { ReportMetricStrip } from '@/components/reportes/layout/ReportMetricStrip';
import { ReportTrendPanel } from '@/components/reportes/layout/ReportTrendPanel';
import {
  calcularMetricasComparacionPeriodo,
  filtrarVentasPorPeriodo,
  procesarDatosGraficoPorPeriodo,
  tituloGraficoPeriodo,
} from '@/utils/dashboardPeriodo';
import { generarInsightsResumen } from '@/utils/reportInsights';

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
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
  const { periodo, etiqueta, filtrosFecha } = useReportPeriodContext();
  const { setActions } = useReportPageActions();
  const [resumen, setResumen] = useState<ResumenVentasLocal | null>(null);
  const [chartPoints, setChartPoints] = useState<Array<{ label: string; ventas: number }>>([]);
  const [allVentas, setAllVentas] = useState<Venta[]>([]);
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

      const todasLasVentas = await VentaService.obtenerTodasVentas();
      if (!Array.isArray(todasLasVentas)) throw new Error('No se pudieron obtener datos de ventas');

      setAllVentas(todasLasVentas as Venta[]);

      const ventasPeriodo = filtrarVentasPorPeriodo(todasLasVentas as Venta[], periodo);
      const totalVentas = ventasPeriodo.reduce((sum, v) => sum + (v.totalVentas || 0), 0);
      const totalOrdenes = ventasPeriodo.length;
      const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
      const productosVendidos = ventasPeriodo.reduce((sum, v) => {
        if (v.detalles?.length) return sum + v.detalles.reduce((d, det) => d + det.cantidad, 0);
        return sum;
      }, 0);

      const clientesUnicos = new Set(
        ventasPeriodo.map((v) => v.cliente?.idCliente).filter((id) => id !== undefined)
      ).size;

      const comparacion = calcularMetricasComparacionPeriodo(todasLasVentas as Venta[], periodo);

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
      });

      setChartPoints(procesarDatosGraficoPorPeriodo(ventasPeriodo, periodo));

      try {
        await ReporteService.getResumenGeneral();
      } catch {
        /* fallback cliente */
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
      });
      setChartPoints([]);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

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
    let cancelled = false;
    const loadExtra = async () => {
      try {
        const [categorias, productos, ventas] = await Promise.all([
          ReporteService.getReportePorCategoria(filtrosFecha),
          ReporteService.getProductosMasVendidos({ ...filtrosFecha, limite: 10 }),
          VentaService.obtenerTodasVentas(),
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
  }, [periodo, filtrosFecha]);

  const insights = useMemo(() => {
    if (!resumen) return null;
    return generarInsightsResumen({ ...resumen, ...extraInsights, chartPoints });
  }, [resumen, extraInsights, chartPoints]);

  const dayData = useMemo(() => buildDayData(allVentas), [allVentas]);

  const exportarAExcel = useCallback(async () => {
    if (!resumen) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }
    try {
      const workbook = XLSX.utils.book_new();
      const resumenData = [
        ['RESUMEN EJECUTIVO', '', '', ''],
        ['Período', etiqueta, '', ''],
        ['', '', '', ''],
        ['Métrica', 'Valor', 'Crecimiento %', ''],
        ['Ingresos', resumen.totalVentas, resumen.crecimientoVentas, ''],
        ['Transacciones', resumen.totalOrdenes, resumen.crecimientoOrdenes, ''],
        ['Ticket Promedio', resumen.ticketPromedio, resumen.crecimientoTicket, ''],
        ['Productos vendidos (uds)', resumen.productosVendidos, '', ''],
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
      const ws = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Resumen Ejecutivo');
      XLSX.writeFile(workbook, `resumen-general-${new Date().toISOString().split('T')[0]}.xlsx`);
      setAlertModal({ open: true, message: 'Resumen exportado correctamente', variant: 'success' });
    } catch {
      setAlertModal({ open: true, message: 'Error al exportar Excel', variant: 'error' });
    }
  }, [resumen, etiqueta, insights, categoriasVentas]);

  useEffect(() => {
    setActions(
      <PageActionButton onClick={exportarAExcel} disabled={loading || !resumen}>
        <ArrowDownTrayIcon className="h-4 w-4" />
        Exportar Excel
      </PageActionButton>
    );
    return () => setActions(null);
  }, [setActions, exportarAExcel, loading, resumen]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="reports-analytics__metric-strip">
          <div className="report-metric-strip__health min-h-[160px] rounded-2xl bg-[var(--app-bg-muted)] animate-pulse" />
          <div className="report-metric-strip__kpis">
            <MetricCardsSkeleton
              count={3}
              className="report-metric-strip__kpi-grid w-full"
            />
          </div>
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-panel rounded-2xl border p-4 border-[color-mix(in_srgb,var(--app-metric-icon-5-fg)_40%,var(--app-border))]">
        <p className="text-sm font-bold text-[var(--app-metric-icon-5-fg)]">{error}</p>
      </div>
    );
  }

  if (!resumen || !insights) {
    return (
      <div className="app-panel rounded-2xl border p-4">
        <p className="text-sm app-text-muted">No hay datos disponibles para el período seleccionado.</p>
      </div>
    );
  }

  const etiquetaLower = etiqueta.toLowerCase();

  return (
    <div className="space-y-6">
      <ReportMetricStrip resumen={resumen} insights={insights} etiquetaPeriodo={etiqueta} />

      {insights.drivers.length > 0 ? <ReportDriverCards drivers={insights.drivers} /> : null}

      <ReportTrendPanel
        chartPoints={chartPoints}
        dayData={dayData}
        tituloGrafico="Ritmo de ingresos"
        subtitulo={`Tendencia ${etiquetaLower} y distribución por día de la semana`}
        gradientId="areaGradResumen"
        serieLabel={`${tituloGraficoPeriodo(periodo)} — ${new Date().getFullYear()}`}
      />

      <ReportCategoryBreakdown categorias={categoriasVentas} />

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
