import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { MaterialIcon, AlertModal, ChartSkeleton, PageActionButton, PageActionGroup, SectionHeader } from '@/shared/ui';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { ReportTrendPanel } from '@/components/reportes/layout/ReportTrendPanel';
import { useReportPeriodContext } from '@/components/reportes/context/ReportPeriodContext';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import type { DetalleVenta } from '@/types/DetalleVenta';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';

interface ForecastDay {
  fechaISO: string;
  fecha: string;
  ingresos: number;
  unidades: number;
  transacciones: number;
}

interface CsvDetalleRow {
  idProducto: string;
  color: string;
  talla: string;
  cantidad: number;
  fecha: string;
}

interface DailyAggregate {
  ingresos: number;
  unidades: number;
  transacciones: number;
}

type VarianteDetalleLike = {
  idProductoVariante?: number;
  color?: string | { nombre?: string } | null;
  talla?: string | { nombreTalla?: string } | null;
  producto?: { idProducto?: number; nombre?: string } | null;
};

const formatterMonedaPE = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const parsearFechaVenta = (fechaStr: string): Date => {
  try {
    if (fechaStr.includes(' ')) {
      const [fecha, hora] = fechaStr.split(' ');
      const [year, month, day] = fecha.split('-').map(Number);
      const [hours, minutes, secondsStr] = hora.split(':');
      const seconds = Number.parseFloat(secondsStr.split('.')[0]);
      const milliseconds = secondsStr.includes('.')
        ? Number.parseInt(secondsStr.split('.')[1].substring(0, 3).padEnd(3, '0'))
        : 0;
      return new Date(year, month - 1, day, Number.parseInt(hours), Number.parseInt(minutes), seconds, milliseconds);
    }

    return new Date(fechaStr);
  } catch {
    return new Date();
  }
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
const formatDateCsv = (date: Date) =>
  date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const escapeCsvValue = (value: string | number): string => {
  const normalized = String(value).replaceAll('"', '""');
  return `"${normalized}"`;
};

const resolverTextoVariante = (
  value: string | { nombre?: string; nombreTalla?: string } | null | undefined,
  fallback: string
) => {
  if (typeof value === 'string') return value.trim() || fallback;
  if (value && typeof value === 'object') {
    return (value.nombre ?? value.nombreTalla ?? '').trim() || fallback;
  }
  return fallback;
};

const buildForecastSeries = (
  ventasFiltradas: Venta[],
  fechaInicio: string,
  fechaFin: string
): { chartPoints: Array<{ label: string; ventas: number }>; dayData: Array<{ dia: string; ventas: number }>; forecast: ForecastDay[] } => {
  if (!fechaInicio || !fechaFin) {
    return { chartPoints: [], dayData: [], forecast: [] };
  }

  const inicio = startOfLocalDay(new Date(`${fechaInicio}T00:00:00`));
  const fin = startOfLocalDay(new Date(`${fechaFin}T00:00:00`));
  const agregados = new Map<string, DailyAggregate>();
  const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  ventasFiltradas.forEach((venta) => {
    const fechaVenta = parsearFechaVenta(venta.fechaVenta);
    if (Number.isNaN(fechaVenta.getTime())) return;

    const key = formatDateKey(startOfLocalDay(fechaVenta));
    const detalleUnidades = venta.detalles?.reduce((suma, detalle) => suma + (detalle.cantidad || 0), 0) || 0;
    const current = agregados.get(key) || { ingresos: 0, unidades: 0, transacciones: 0 };

    current.ingresos += venta.totalVentas || 0;
    current.unidades += detalleUnidades;
    current.transacciones += 1;
    agregados.set(key, current);
  });

  const timeline: Array<{ date: Date; aggregate: DailyAggregate }> = [];
  for (let cursor = new Date(inicio); cursor <= fin; cursor = addDays(cursor, 1)) {
    const date = new Date(cursor);
    timeline.push({
      date,
      aggregate: agregados.get(formatDateKey(date)) || { ingresos: 0, unidades: 0, transacciones: 0 },
    });
  }

  const chartPoints = timeline.map(({ date, aggregate }) => ({
    label: formatDateLabel(date),
    ventas: aggregate.ingresos,
  }));

  const dayBuckets = diaSemana.map((dia) => ({ dia, ventas: 0 }));
  timeline.forEach(({ date, aggregate }) => {
    dayBuckets[date.getDay()].ventas += aggregate.ingresos;
  });

  const recentWindow = timeline.slice(-Math.min(7, timeline.length));
  const avgIngresos = recentWindow.length
    ? recentWindow.reduce((sum, item) => sum + item.aggregate.ingresos, 0) / recentWindow.length
    : 0;
  const avgUnidades = recentWindow.length
    ? recentWindow.reduce((sum, item) => sum + item.aggregate.unidades, 0) / recentWindow.length
    : 0;
  const avgTransacciones = recentWindow.length
    ? recentWindow.reduce((sum, item) => sum + item.aggregate.transacciones, 0) / recentWindow.length
    : 0;

  const lastDate = timeline.at(-1)?.date ?? fin;
  const forecast: ForecastDay[] = Array.from({ length: 7 }, (_, index) => {
    const nextDate = addDays(lastDate, index + 1);
    return {
      fechaISO: formatDateKey(nextDate),
      fecha: formatDateLabel(nextDate),
      ingresos: avgIngresos,
      unidades: avgUnidades,
      transacciones: avgTransacciones,
    };
  });

  return { chartPoints, dayData: dayBuckets, forecast };
};

const buildCsvContent = (rows: CsvDetalleRow[]) => {
  const headers = ['ID de Producto', 'Color', 'Talla', 'Cantidad', 'Fecha'];
  const lines = [headers.map(escapeCsvValue).join(';')];

  rows.forEach((row) => {
    lines.push(
      [row.idProducto, row.color, row.talla, row.cantidad, row.fecha]
        .map(escapeCsvValue)
        .join(';')
    );
  });

  return lines.join('\r\n');
};

const PrediccionVentas: React.FC = () => {
  const { filtrosFecha, etiqueta } = useReportPeriodContext();
  const { setActions } = useReportPageActions();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({
    open: false,
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    const cargarVentas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await VentaService.obtenerTodasVentas();
        setVentas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error al cargar ventas para predicción:', err);
        setError('No se pudieron cargar los datos necesarios para la predicción');
        setVentas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarVentas();
  }, []);

  const ventasFiltradas = useMemo(() => {
    if (!filtrosFecha.fechaInicio || !filtrosFecha.fechaFin) return ventas;

    const fechaInicio = startOfLocalDay(new Date(`${filtrosFecha.fechaInicio}T00:00:00`));
    const fechaFin = startOfLocalDay(new Date(`${filtrosFecha.fechaFin}T00:00:00`));

    return ventas.filter((venta) => {
      const fechaVenta = startOfLocalDay(parsearFechaVenta(venta.fechaVenta));
      return !Number.isNaN(fechaVenta.getTime()) && fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });
  }, [ventas, filtrosFecha.fechaInicio, filtrosFecha.fechaFin]);

  const { chartPoints, dayData, forecast } = useMemo(
    () => buildForecastSeries(ventasFiltradas, filtrosFecha.fechaInicio || '', filtrosFecha.fechaFin || ''),
    [ventasFiltradas, filtrosFecha.fechaInicio, filtrosFecha.fechaFin]
  );

  const detalleRows = useMemo(() => {
    return ventasFiltradas.flatMap((venta) => {
      const fechaVenta = parsearFechaVenta(venta.fechaVenta);
      const fechaFormateada = formatDateCsv(fechaVenta);

      return (venta.detalles || []).map((detalle) => {
        const detalleVenta = detalle as DetalleVenta & { productoVariante?: VarianteDetalleLike };
        const productoVariante = detalleVenta.productoVariante;
        const productoBaseId =
          productoVariante?.producto?.idProducto ??
          productoVariante?.idProductoVariante ??
          '';

        return {
          idProducto: String(productoBaseId),
          color: resolverTextoVariante(productoVariante?.color, 'SIN COLOR').toUpperCase(),
          talla: resolverTextoVariante(productoVariante?.talla, 'SIN TALLA').toUpperCase(),
          cantidad: detalleVenta.cantidad || 0,
          fecha: fechaFormateada,
        } satisfies CsvDetalleRow;
      });
    });
  }, [ventasFiltradas]);

  const totalIngresos = useMemo(
    () => ventasFiltradas.reduce((sum, venta) => sum + (venta.totalVentas || 0), 0),
    [ventasFiltradas]
  );

  const totalUnidades = useMemo(
    () => ventasFiltradas.reduce((sum, venta) => sum + (venta.detalles?.reduce((suma, detalle) => suma + (detalle.cantidad || 0), 0) || 0), 0),
    [ventasFiltradas]
  );

  const totalTransacciones = ventasFiltradas.length;
  const promedioDiario = useMemo(() => {
    if (!filtrosFecha.fechaInicio || !filtrosFecha.fechaFin) return totalIngresos;
    const inicio = startOfLocalDay(new Date(`${filtrosFecha.fechaInicio}T00:00:00`));
    const fin = startOfLocalDay(new Date(`${filtrosFecha.fechaFin}T00:00:00`));
    const dias = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1);
    return totalIngresos / dias;
  }, [filtrosFecha.fechaInicio, filtrosFecha.fechaFin, totalIngresos]);

  const proyeccionSiguienteSemana = useMemo(
    () => forecast.reduce((sum, day) => sum + day.ingresos, 0),
    [forecast]
  );

  const proyeccionUnidades = useMemo(
    () => forecast.reduce((sum, day) => sum + day.unidades, 0),
    [forecast]
  );

  const exportarAExcel = useCallback(() => {
    if (detalleRows.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      const resumen = XLSX.utils.aoa_to_sheet([
        ['Métrica', 'Valor'],
        ['Periodo', etiqueta],
        ['Ventas históricas', totalTransacciones],
        ['Unidades vendidas', totalUnidades],
        ['Ingresos históricos', totalIngresos],
        ['Promedio diario', promedioDiario],
        ['Proyección 7 días', proyeccionSiguienteSemana],
        ['Proyección unidades 7 días', proyeccionUnidades],
      ]);
      XLSX.utils.book_append_sheet(workbook, resumen, 'Predicción');

      const detalleExcel = XLSX.utils.json_to_sheet(detalleRows);
      XLSX.utils.book_append_sheet(workbook, detalleExcel, 'Detalle ventas');

      XLSX.writeFile(workbook, `prediccion_ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel de predicción:', err);
      setAlertModal({ open: true, message: 'Error al exportar Excel', variant: 'error' });
    }
  }, [detalleRows, etiqueta, promedioDiario, proyeccionSiguienteSemana, proyeccionUnidades, totalIngresos, totalTransacciones, totalUnidades]);

  const exportarCsv = useCallback(() => {
    if (detalleRows.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      const csv = buildCsvContent(detalleRows);
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prediccion_ventas_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar CSV de predicción:', err);
      setAlertModal({ open: true, message: 'Error al exportar CSV', variant: 'error' });
    }
  }, [detalleRows]);

  useEffect(() => {
    setActions(
      <PageActionGroup>
        <PageActionButton onClick={exportarAExcel} disabled={loading || detalleRows.length === 0} grouped>
          <MaterialIcon icon="download" className="h-4 w-4" />
          Exportar Excel
        </PageActionButton>
        <PageActionButton onClick={exportarCsv} disabled={loading || detalleRows.length === 0} grouped variant="secondary">
          <MaterialIcon icon="table_view" className="h-4 w-4" />
          Exportar CSV
        </PageActionButton>
      </PageActionGroup>
    );

    return () => setActions(null);
  }, [setActions, exportarAExcel, exportarCsv, loading, detalleRows.length]);

  const confianza = useMemo(() => {
    const base = Math.min(92, 55 + Math.round((ventasFiltradas.length / Math.max(1, forecast.length)) * 3));
    return `${Math.max(60, base)}%`;
  }, [forecast.length, ventasFiltradas.length]);

  if (loading) {
    return <ChartSkeleton height="h-[360px]" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MaterialIcon icon="query_stats" className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportInsightBanner
        headline="Predicción de ventas"
        icon="query_stats"
        message={`La proyección usa el comportamiento del período ${etiqueta} y detalla cada venta por producto base, color y talla.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardMetricCard label="Ventas históricas" value={totalTransacciones} icon="receipt_long" iconIndex={1} sub={etiqueta} />
        <DashboardMetricCard label="Ingresos históricos" value={formatterMonedaPE.format(totalIngresos)} icon="payments" iconIndex={2} sub={etiqueta} />
        <DashboardMetricCard label="Proyección 7 días" value={formatterMonedaPE.format(proyeccionSiguienteSemana)} icon="trending_up" iconIndex={3} sub="Ingresos esperados" />
        <DashboardMetricCard label="Confianza" value={confianza} icon="shield" iconIndex={4} sub="Basada en la muestra actual" />
      </div>

      <ReportTrendPanel
        chartPoints={chartPoints}
        dayData={dayData}
        tituloGrafico="Tendencia base para la predicción"
        subtitulo={`Histórico del período ${etiqueta}`}
        serieLabel="Ingresos históricos"
        gradientId="areaGradPrediccion"
      />

      <DashboardPanel className="p-5 sm:p-6">
        <SectionHeader
          title="Pronóstico de la próxima semana"
          subtitle="Estimación diaria construida desde el promedio reciente del período actual"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 mt-5">
          {forecast.map((day) => (
            <div
              key={day.fechaISO}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] p-4 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] app-text-faint">{day.fecha}</p>
              <p className="mt-2 text-lg font-black app-heading tabular-nums">{formatterMonedaPE.format(day.ingresos)}</p>
              <p className="mt-1 text-xs app-text-muted">{day.unidades.toFixed(0)} unidades</p>
              <p className="mt-1 text-xs app-text-muted">{day.transacciones.toFixed(0)} transacciones</p>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-5 sm:p-6">
        <SectionHeader title={`Detalle para CSV (${detalleRows.length})`} subtitle="Cada fila corresponde a un detalle de venta" />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--app-border)]">
            <thead className="bg-[var(--app-bg-muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">ID Producto</th>
                <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Color</th>
                <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Talla</th>
                <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-[10px] font-black app-text-faint uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {detalleRows.slice(0, 8).map((row, index) => (
                <tr key={`${row.idProducto}-${row.fecha}-${index}`} className="hover:bg-[var(--app-bg-muted)]/50">
                  <td className="px-6 py-4 text-sm app-heading">{row.idProducto}</td>
                  <td className="px-6 py-4 text-sm app-heading">{row.color}</td>
                  <td className="px-6 py-4 text-sm app-heading">{row.talla}</td>
                  <td className="px-6 py-4 text-sm app-heading tabular-nums">{row.cantidad}</td>
                  <td className="px-6 py-4 text-sm app-heading">{row.fecha}</td>
                </tr>
              ))}
              {detalleRows.length > 8 ? (
                <tr>
                  <td className="px-6 py-4 text-sm app-text-muted" colSpan={5}>
                    Mostrando solo las primeras 8 filas. El archivo CSV incluirá todos los registros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      <AlertModal
        open={alertModal.open}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PrediccionVentas;
