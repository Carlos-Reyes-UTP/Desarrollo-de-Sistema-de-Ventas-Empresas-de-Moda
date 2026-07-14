import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CubeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import type { ProductoMasVendido, TallaProducto, VarianteMasVendida, VariantesPorColor } from '../../types/ReporteVentas';
import { CategoriaService } from '../../services/CategoriaService';
import type { Categoria } from '../../types/Categoria';
import { AlertModal, ChartSkeleton, TableSkeleton, Skeleton, PageActionButton } from '@/shared/ui';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';
import { generarInsightProductos } from '@/utils/reportInsights';
import {
  formatVarianteCategoria,
  formatVarianteLabel,
  getBottomNByUnits,
  getTopNByUnits,
  orderByUnitsDesc,
  varianteToProductoShell,
} from '@/utils/reportProductRank';
import {
  ProductReportControls,
  type ProductAnalysisMode,
} from '@/components/reportes/productos/ProductReportControls';
import { ProductMetricStrip } from '@/components/reportes/productos/ProductMetricStrip';
import { ProductRankDualPanel } from '@/components/reportes/productos/ProductRankDualPanel';
import { ProductRankTable } from '@/components/reportes/productos/ProductRankTable';
import { ProductIndividualMode } from '@/components/reportes/productos/ProductIndividualMode';

type FiltrosReporte = {
  idCategoriaPadre?: string;
  fechaInicio?: string;
  fechaFin?: string;
  limite?: number;
};

const dateToStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hoy = new Date();
const INICIO_MES = dateToStr(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
const HOY = dateToStr(hoy);

const ProductosMasVendidos: React.FC = () => {
  const { setActions } = useReportPageActions();
  const [variantes, setVariantes] = useState<VarianteMasVendida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaPadre, setCategoriaPadre] = useState('');
  const [fechaInicio, setFechaInicio] = useState(INICIO_MES);
  const [fechaFin, setFechaFin] = useState(HOY);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    message: string;
    variant: 'error' | 'info' | 'success';
  }>({ open: false, message: '', variant: 'info' });

  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoMasVendido | null>(null);
  const [tallasProducto, setTallasProducto] = useState<TallaProducto[]>([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null);
  const [variantesPorColor, setVariantesPorColor] = useState<VariantesPorColor[]>([]);
  const [mostrarAnalisisDetallado, setMostrarAnalisisDetallado] = useState(false);
  const [isClosingDetallado, setIsClosingDetallado] = useState(false);
  const [loadingTallas, setLoadingTallas] = useState(false);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [tipoGraficoVariantes, setTipoGraficoVariantes] = useState<'barras' | 'torta'>('barras');
  const [tipoAnalisis, setTipoAnalisis] = useState<ProductAnalysisMode>('ranking');

  useEffect(() => {
    CategoriaService.obtenerCategoriasPrincipales().then(setCategorias);
  }, []);

  const insightProductos = useMemo(
    () =>
      generarInsightProductos(
        variantes.map((v) => ({
          nombreProducto: formatVarianteLabel(v),
          cantidadVendida: v.cantidadVendida,
        }))
      ),
    [variantes]
  );

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError(null);
        const filtrosReporte: FiltrosReporte = { limite: 500 };
        if (categoriaPadre) filtrosReporte.idCategoriaPadre = categoriaPadre;
        if (fechaInicio && fechaFin) {
          filtrosReporte.fechaInicio = new Date(fechaInicio + 'T00:00:00').toISOString();
          filtrosReporte.fechaFin = new Date(fechaFin + 'T23:59:59').toISOString();
        }
        const data = await ReporteService.getVariantesMasVendidas(filtrosReporte);
        setVariantes(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar el ranking de variantes');
        setVariantes([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [fechaInicio, fechaFin, categoriaPadre]);

  const ordered = useMemo(() => orderByUnitsDesc(variantes), [variantes]);
  const top10 = useMemo(() => getTopNByUnits(variantes, 10), [variantes]);
  const bottom10 = useMemo(() => getBottomNByUnits(variantes, 10), [variantes]);

  /** Productos únicos derivados del ranking de variantes (para modo Individual). */
  const productosDesdeVariantes = useMemo(() => {
    const map = new Map<number, ProductoMasVendido>();
    for (const v of ordered) {
      const existing = map.get(v.idProducto);
      if (!existing) {
        map.set(v.idProducto, varianteToProductoShell(v));
      } else {
        existing.cantidadVendida += v.cantidadVendida;
        existing.ingresosTotales += Number(v.ingresosTotales);
      }
    }
    return orderByUnitsDesc([...map.values()]);
  }, [ordered]);

  const productosBusqueda = useMemo(
    () =>
      productosDesdeVariantes.filter(
        (producto) =>
          producto.nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
          (producto.categoria?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)
      ),
    [productosDesdeVariantes, busqueda]
  );

  const metricas = useMemo(() => {
    const unidades = variantes.reduce((s, v) => s + Number(v.cantidadVendida), 0);
    const ingresos = variantes.reduce((s, v) => s + Number(v.ingresosTotales), 0);
    const precioPromedio =
      variantes.length > 0
        ? variantes.reduce((s, v) => s + Number(v.precioPromedio || 0), 0) / variantes.length
        : 0;
    return { enRanking: variantes.length, unidades, ingresos, precioPromedio };
  }, [variantes]);

  const limpiarSeleccionCategoria = () => setCategoriaPadre('');

  const limpiarFiltros = () => {
    setCategoriaPadre('');
    setFechaInicio(INICIO_MES);
    setFechaFin(HOY);
    setBusqueda('');
  };

  const seleccionarProducto = async (producto: ProductoMasVendido) => {
    setProductoSeleccionado(producto);
    setMostrarAnalisisDetallado(true);
    setTallaSeleccionada(null);
    setVariantesPorColor([]);
    try {
      setLoadingTallas(true);
      const tallas = await ReporteService.getTallasPorProducto(producto.idProducto);
      setTallasProducto(tallas);
    } catch {
      setTallasProducto([]);
    } finally {
      setLoadingTallas(false);
    }
  };

  const abrirEnIndividual = (variante: VarianteMasVendida) => {
    setTipoAnalisis('individual');
    void seleccionarProducto(varianteToProductoShell(variante));
  };

  const seleccionarTalla = async (nombreTalla: string) => {
    if (!productoSeleccionado) return;
    setTallaSeleccionada(nombreTalla);
    try {
      setLoadingVariantes(true);
      const data = await ReporteService.getVariantesPorColor(
        productoSeleccionado.idProducto,
        nombreTalla,
        fechaInicio,
        fechaFin
      );
      setVariantesPorColor(data);
    } catch {
      setVariantesPorColor([]);
    } finally {
      setLoadingVariantes(false);
    }
  };

  const cerrarAnalisisDetallado = () => {
    setIsClosingDetallado(true);
    window.setTimeout(() => {
      setMostrarAnalisisDetallado(false);
      setProductoSeleccionado(null);
      setTallasProducto([]);
      setTallaSeleccionada(null);
      setVariantesPorColor([]);
      setIsClosingDetallado(false);
    }, 240);
  };

  const handleModeChange = (mode: ProductAnalysisMode) => {
    setTipoAnalisis(mode);
    if (mode === 'ranking' && mostrarAnalisisDetallado) {
      cerrarAnalisisDetallado();
    }
  };

  const aplicarFiltroRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    const now = new Date();
    const fechaFinStr = dateToStr(now);
    let fechaInicioStr = fechaFinStr;
    if (tipo === 'semana') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      fechaInicioStr = dateToStr(d);
    } else if (tipo === 'mes') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      fechaInicioStr = dateToStr(d);
    }
    setFechaInicio(fechaInicioStr);
    setFechaFin(fechaFinStr);
  };

  const exportarDatos = useCallback(async () => {
    if (variantes.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const filas = orderByUnitsDesc(variantes).map((v, index) => ({
        '#': index + 1,
        Variante: formatVarianteLabel(v),
        Producto: v.nombreProducto,
        Color: v.color,
        Talla: v.talla,
        Categoría: formatVarianteCategoria(v),
        Código: v.codigoIdentificacion,
        'Cantidad Vendida': Number(v.cantidadVendida),
        'Ingreso Total (S/)': Number(v.ingresosTotales),
        'Precio Promedio (S/)': Number(v.precioPromedio),
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 40 },
        { wch: 24 },
        { wch: 12 },
        { wch: 10 },
        { wch: 28 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Ranking Variantes');

      let nombreArchivo = 'variantes_mas_vendidas';
      if (fechaInicio && fechaFin) nombreArchivo += `_${fechaInicio}_${fechaFin}`;
      if (categoriaPadre) {
        const categoria = categorias.find((c) => c.idCategoria?.toString() === categoriaPadre);
        if (categoria) nombreArchivo += `_${categoria.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      nombreArchivo += `_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    } catch (err) {
      console.error('Error al exportar datos:', err);
      setAlertModal({
        open: true,
        message: 'Error al generar el reporte. Inténtalo nuevamente.',
        variant: 'error',
      });
    }
  }, [variantes, categorias, fechaInicio, fechaFin, categoriaPadre]);

  useEffect(() => {
    setActions(
      <PageActionButton onClick={exportarDatos} disabled={loading || variantes.length === 0}>
        <ArrowDownTrayIcon className="h-4 w-4" />
        Exportar Excel
      </PageActionButton>
    );
  }, [setActions, exportarDatos, loading, variantes.length]);

  if (loading) {
    return (
      <div className="space-y-6 product-report-root">
        <Skeleton className="h-8 w-64" />
        <ChartSkeleton />
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 product-report-root">
        <div className="text-center">
          <CubeIcon className="h-12 w-12 app-text-faint mx-auto mb-3" />
          <p className="app-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-report-root space-y-5">
      {insightProductos ? (
        <ReportInsightBanner message={insightProductos} headline="Mix de variantes" icon="inventory_2" />
      ) : null}

      <ProductReportControls
        categorias={categorias}
        categoriaPadre={categoriaPadre}
        onCategoriaPadre={setCategoriaPadre}
        onClearCategoria={limpiarSeleccionCategoria}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onFechaInicio={setFechaInicio}
        onFechaFin={setFechaFin}
        onQuickFilter={aplicarFiltroRapido}
        onClearFilters={limpiarFiltros}
        mode={tipoAnalisis}
        onMode={handleModeChange}
      />

      <ProductMetricStrip
        enRanking={metricas.enRanking}
        unidades={metricas.unidades}
        ingresos={metricas.ingresos}
        precioPromedio={metricas.precioPromedio}
      />

      {tipoAnalisis === 'ranking' ? (
        <div className="product-report-crossfade space-y-5" key="ranking">
          <ProductRankDualPanel
            top10={top10}
            bottom10={bottom10}
            totalCount={variantes.length}
            onSelect={abrirEnIndividual}
          />
          <ProductRankTable variantes={ordered} onVer={abrirEnIndividual} />
        </div>
      ) : (
        <ProductIndividualMode
          key="individual"
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          productos={productosBusqueda}
          onSelectProducto={seleccionarProducto}
          productoSeleccionado={productoSeleccionado}
          tallasProducto={tallasProducto}
          tallaSeleccionada={tallaSeleccionada}
          onSelectTalla={seleccionarTalla}
          variantesPorColor={variantesPorColor}
          loadingTallas={loadingTallas}
          loadingVariantes={loadingVariantes}
          tipoGraficoVariantes={tipoGraficoVariantes}
          onTipoGraficoVariantes={setTipoGraficoVariantes}
          onCerrarDetalle={cerrarAnalisisDetallado}
          mostrarDetalle={mostrarAnalisisDetallado}
          isClosing={isClosingDetallado}
        />
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

export default ProductosMasVendidos;
