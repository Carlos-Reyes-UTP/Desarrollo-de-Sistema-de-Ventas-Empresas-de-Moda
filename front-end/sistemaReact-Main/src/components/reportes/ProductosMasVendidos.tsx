import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CubeIcon,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import type { ProductoMasVendido, TallaProducto, VariantesPorColor } from '../../types/ReporteVentas';
import { CategoriaService } from '../../services/CategoriaService';
import type { Categoria } from '../../types/Categoria';
import {
  CustomPieLabel,
  CustomTooltip,
  CustomTooltipVariantes,
} from './productos-mas-vendidos/chartRenderers';
import { AlertModal, ChartSkeleton, TableSkeleton, Skeleton, SectionHeader, PageActionButton } from '@/shared/ui';
import { useReportPageActions } from '@/components/reportes/context/ReportPageActionsContext';
import { ReportInsightBanner } from '@/components/reportes/layout/ReportInsightBanner';
import { ReportViewPills } from '@/components/reportes/layout/ReportViewPills';
import { reportChartAxisTick } from '@/components/reportes/layout/reportChartTheme';
import { DashboardMetricCard } from '@/shared/ui/dashboard/DashboardMetricCard';
import { DashboardPanel } from '@/shared/ui/dashboard/DashboardPanel';
import { DatePickerPopover } from '@/components/reportes/shared/DatePickerPopover';
import { generarInsightProductos } from '@/utils/reportInsights';

// Estilos CSS para animaciones
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .animate-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .slide-in-from-bottom-4 {
    animation: slideInFromBottom 0.5s ease-out;
  }
  
  .slide-in-from-right-4 {
    animation: slideInFromRight 0.4s ease-out;
  }
  
  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// Insertar estilos en el head del documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = animationStyles;
  document.head.appendChild(styleSheet);
}

type VistaGraficoReporte = 'barras' | 'linea' | 'tabla';
type TipoAnalisis = 'ranking' | 'individual';

const VISTAS_PRODUCTOS_RANKING = [
  { id: 'barras' as const, label: 'Barras' },
  { id: 'linea' as const, label: 'Línea' },
];
type FiltrosReporte = {
  idCategoriaPadre?: string;
  fechaInicio?: string;
  fechaFin?: string;
};
const dateToStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hoy = new Date();
const INICIO_MES = dateToStr(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
const HOY = dateToStr(hoy);

// Función auxiliar para determinar si un color es oscuro
const isColorDark = (color: string): boolean => {
  if (!color) return false;
  let c = color.substring(1);      // strip #
  let rgb = parseInt(c, 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >>  8) & 0xff;
  let b = (rgb >>  0) & 0xff;
  let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // ITU-R BT.709
  return luma < 128;
};

const ProductosMasVendidos: React.FC = () => {
  const { setActions } = useReportPageActions();
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaGrafico, setVistaGrafico] = useState<VistaGraficoReporte>('barras');
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaPadre, setCategoriaPadre] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>(INICIO_MES);
  const [fechaFin, setFechaFin] = useState<string>(HOY);
  const [searchCategoria, setSearchCategoria] = useState<string>('');
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; variant: 'error' | 'info' | 'success' }>({ open: false, message: '', variant: 'info' });
  
  // Estados para el análisis detallado por producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoMasVendido | null>(null);
  const [tallasProducto, setTallasProducto] = useState<TallaProducto[]>([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null);
  const [variantesPorColor, setVariantesPorColor] = useState<VariantesPorColor[]>([]);
  const [mostrarAnalisisDetallado, setMostrarAnalisisDetallado] = useState(false);
  const [isClosingDetallado, setIsClosingDetallado] = useState(false);
  const [loadingTallas, setLoadingTallas] = useState(false);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [tipoGraficoVariantes, setTipoGraficoVariantes] = useState<'barras' | 'torta'>('barras');
  const [tipoAnalisis, setTipoAnalisis] = useState<TipoAnalisis>('ranking');
  const [isTipoAnalisisOpen, setIsTipoAnalisisOpen] = useState(false);
  
  // Referencias para los campos de búsqueda
  const categoriaRef = useRef<HTMLDivElement>(null);
  const tipoAnalisisRef = useRef<HTMLDivElement>(null);
  const analisisDetalladoRef = useRef<HTMLDivElement>(null);
  
  // Forzar vista correcta al cambiar modo
  useEffect(() => {
    if (tipoAnalisis === 'individual') {
      setVistaGrafico('tabla');
    } else if (vistaGrafico === 'tabla') {
      setVistaGrafico('barras');
    }
  }, [tipoAnalisis]);
  
  useEffect(() => {
    CategoriaService.obtenerCategoriasPrincipales().then(setCategorias);
  }, []);

  const insightProductos = useMemo(
    () =>
      generarInsightProductos(
        productos.map((p) => ({ nombreProducto: p.nombreProducto, cantidadVendida: p.cantidadVendida }))
      ),
    [productos]
  );

  // Manejar clics fuera del componente de búsqueda para cerrar la lista
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaRef.current && !categoriaRef.current.contains(event.target as Node)) {
        setSearchCategoria('');
        setIsCategoriaFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoriaFocused, searchCategoria]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tipoAnalisisRef.current && !tipoAnalisisRef.current.contains(event.target as Node)) {
        setIsTipoAnalisisOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTipoAnalisisOpen]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoading(true);
        setError(null);
        const filtrosReporte: FiltrosReporte = {};
        
        if (categoriaPadre) {
          filtrosReporte.idCategoriaPadre = categoriaPadre;
        }
        
        if (fechaInicio && fechaFin) {
          const fechaInicioISO = new Date(fechaInicio + 'T00:00:00').toISOString();
          const fechaFinISO = new Date(fechaFin + 'T23:59:59').toISOString();
          filtrosReporte.fechaInicio = fechaInicioISO;
          filtrosReporte.fechaFin = fechaFinISO;
        }
        
        const data = await ReporteService.getProductosMasVendidos(filtrosReporte);
        setProductos(data);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : 'Error al cargar los productos más vendidos');
        console.error('Error:', err);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };
    
    cargarProductos();
    
  }, [fechaInicio, fechaFin, categoriaPadre]);

  // Función para filtrar categorías según el término de búsqueda - optimizada con useMemo
  const categoriasFiltradas = useMemo(() => 
    categorias.filter(categoria =>
      searchCategoria === '' || 
      categoria.nombre.toLowerCase().includes(searchCategoria.toLowerCase())
    ), [categorias, searchCategoria]
  );

  // Productos filtrados optimizados con useMemo para evitar re-renders innecesarios
  const productosFiltrados = useMemo(() => 
    productos.filter(producto =>
      producto.nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (producto.categoria?.toLowerCase().includes(busqueda.toLowerCase()))
    ), [productos, busqueda]
  );

  const top5 = useMemo(() => productosFiltrados.slice(0, 5), [productosFiltrados]);
  const bottom5 = useMemo(() => {
    if (productosFiltrados.length <= 5) return [];
    return [...productosFiltrados].slice(-5).reverse();
  }, [productosFiltrados]);

  // Función para limpiar la selección de categoría
  const limpiarSeleccionCategoria = () => {
    setCategoriaPadre('');
    setSearchCategoria('');
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setCategoriaPadre('');
    setFechaInicio(INICIO_MES);
    setFechaFin(HOY);
    setBusqueda('');
    setSearchCategoria('');
  };

  // Funciones para el análisis detallado
  const seleccionarProducto = async (producto: ProductoMasVendido) => {
    setProductoSeleccionado(producto);
    setMostrarAnalisisDetallado(true);
    setTallaSeleccionada(null);
    setVariantesPorColor([]);
    
    // Cargar tallas del producto
    try {
      setLoadingTallas(true);
      const tallas = await ReporteService.getTallasPorProducto(producto.idProducto);
      setTallasProducto(tallas);
    } catch (error) {
      console.error('Error al cargar tallas:', error);
      setTallasProducto([]);
    } finally {
      setLoadingTallas(false);
    }
  };

  const seleccionarTalla = async (nombreTalla: string) => {
    if (!productoSeleccionado) return;
    
    // Actualizar la talla seleccionada inmediatamente para mostrar feedback visual
    setTallaSeleccionada(nombreTalla);
    
    try {
      setLoadingVariantes(true);
      // Mantener las variantes anteriores mientras carga para evitar parpadeo
      const variantes = await ReporteService.getVariantesPorColor(productoSeleccionado.idProducto, nombreTalla, fechaInicio, fechaFin);
      setVariantesPorColor(variantes);
    } catch (error) {
      console.error('Error al cargar variantes por color:', error);
      setVariantesPorColor([]);
    } finally {
      setLoadingVariantes(false);
    }
  };

  const cerrarAnalisisDetallado = () => {
    setIsClosingDetallado(true);
    setTimeout(() => {
      setMostrarAnalisisDetallado(false);
      setProductoSeleccionado(null);
      setTallasProducto([]);
      setTallaSeleccionada(null);
      setVariantesPorColor([]);
      setIsClosingDetallado(false);
    }, 300);
  };

  useEffect(() => {
    if (mostrarAnalisisDetallado) {
      cerrarAnalisisDetallado();
    }
  }, [tipoAnalisis, vistaGrafico]);

  useEffect(() => {
    if (mostrarAnalisisDetallado && analisisDetalladoRef.current && !isClosingDetallado) {
      setTimeout(() => {
        analisisDetalladoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [mostrarAnalisisDetallado, isClosingDetallado]);

  // Función para aplicar filtros rápidos - simplificada para evitar dobles cargas
  const aplicarFiltroRapido = (tipo: 'hoy' | 'semana' | 'mes') => {
    const hoy = new Date();
    const fechaFinStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    let fechaInicioStr = '';
    
    switch (tipo) {
      case 'hoy':
        fechaInicioStr = fechaFinStr;
        break;
      case 'semana': {
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hoy.getDate() - 7);
        fechaInicioStr = `${hace7Dias.getFullYear()}-${String(hace7Dias.getMonth() + 1).padStart(2, '0')}-${String(hace7Dias.getDate()).padStart(2, '0')}`;
        break;
      }
      case 'mes': {
        const hace30Dias = new Date(hoy);
        hace30Dias.setDate(hoy.getDate() - 30);
        fechaInicioStr = `${hace30Dias.getFullYear()}-${String(hace30Dias.getMonth() + 1).padStart(2, '0')}-${String(hace30Dias.getDate()).padStart(2, '0')}`;
        break;
      }
    }
    
    // Solo actualizar los estados de entrada, el useEffect se encargará del resto
    setFechaInicio(fechaInicioStr);
    setFechaFin(fechaFinStr);
  };

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

  const exportarDatos = useCallback(async () => {
    if (productosFiltrados.length === 0) {
      setAlertModal({ open: true, message: 'No hay datos para exportar', variant: 'info' });
      return;
    }

    try {
      // Mostrar indicador de carga
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
      loadingToast.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Generando reporte detallado...</span>
      `;
      document.body.appendChild(loadingToast);

      // Preparar datos detallados para Excel
      const datosDetallados = [];
      
      for (const producto of productosFiltrados) {
        // Agregar fila del producto principal
        const filaProducto = {
          'Tipo': 'PRODUCTO',
          'Nombre del Producto': producto.nombreProducto,
          'Categoría': formatearCategoriaCompleta(producto),
          'Código de Barras': producto.codigoIdentificacion,
          'Cantidad Total Vendida': producto.cantidadVendida,
          'Ingresos Totales (S/)': producto.ingresosTotales
        };
        datosDetallados.push(filaProducto);

        try {
          // Obtener tallas del producto
          const tallas = await ReporteService.getTallasPorProducto(producto.idProducto);
          
          for (const talla of tallas) {
            try {
              // Obtener variantes por color para cada talla
              const variantes = await ReporteService.getVariantesPorColor(producto.idProducto, talla.nombreTalla, fechaInicio, fechaFin);
              
              for (const variante of variantes) {
                
                // Obtener información completa de la variante para el código de barras
                let codigoBarras = 'Sin código';
                try {
                  const varianteCompleta = await ProductoVarianteService.obtenerVariantePorProductoTallaColor(
                    producto.idProducto, 
                    talla.nombreTalla, 
                    variante.nombreColor
                  );
                  codigoBarras = varianteCompleta?.codigoBarrasVariante || varianteCompleta?.codigoIdentificacion || 'Sin código';
                } catch (error) {
                  console.warn(`Error al obtener código de barras para variante:`, error);
                }
                
                // Agregar fila de cada variante con formato mejorado
                datosDetallados.push({
                  'Tipo': 'VARIANTE',
                  'Nombre del Producto': `${producto.nombreProducto} - ${talla.nombreTalla} - ${variante.nombreColor}`,
                  'Categoría': '',
                  'Código de Barras': codigoBarras,
                  'Cantidad Total Vendida': variante.cantidadVendida,
                  'Ingresos Totales (S/)': parseFloat(variante.ingresosTotales.toString())
                });
              }
            } catch (error) {
              console.warn(`Error al cargar variantes para talla ${talla.nombreTalla}:`, error);
            }
          }

        } catch (error) {
          console.warn(`Error al cargar tallas para producto ${producto.nombreProducto}:`, error);
        }
        
        // Agregar fila separadora entre productos
        datosDetallados.push({
          'Tipo': '',
          'Nombre del Producto': '',
          'Categoría': '',
          'Código de Barras': '',
          'Cantidad Total Vendida': '',
          'Ingresos Totales (S/)': ''
        });
      }

      // Crear libro de Excel con múltiples hojas
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen general (datos originales)
      const datosResumen = productosFiltrados.map(producto => ({
        'Producto': producto.nombreProducto,
        'Categoría': formatearCategoriaCompleta(producto),
        'Código': producto.codigoIdentificacion,
        'Cantidad Vendida': producto.cantidadVendida,
        'Ingreso Total (S/)': producto.ingresosTotales,
        'Precio Promedio (S/)': producto.precioPromedio
      }));

      const wsResumen = XLSX.utils.json_to_sheet(datosResumen);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General');

      // Hoja 2: Detalle completo con variantes
      const wsDetalle = XLSX.utils.json_to_sheet(datosDetallados);
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por Variantes');

      // Aplicar formato de negrita a las filas de productos principales
      const range = XLSX.utils.decode_range(wsDetalle['!ref'] || 'A1:A1');
      
      // Formatear encabezados (fila 1)
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCellAddress = XLSX.utils.encode_cell({c: C, r: 0});
        if (wsDetalle[headerCellAddress]) {
          wsDetalle[headerCellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Fondo azul
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      
      // Formatear filas de productos principales
      for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Empezar desde fila 2 (saltar encabezados)
        const tipoCell = wsDetalle[XLSX.utils.encode_cell({c: 0, r: R})]; // Columna A (Tipo)
        if (tipoCell && String(tipoCell.v).trim() === 'PRODUCTO') {
          // Aplicar negrita a toda la fila del producto
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
            if (wsDetalle[cellAddress]) {
              wsDetalle[cellAddress].s = {
                font: { bold: true, size: 12 },
                fill: { fgColor: { rgb: "E6F3FF" } }, // Fondo azul claro para destacar
                alignment: { horizontal: "left", vertical: "center" }
              };
            }
          }
        } else if (tipoCell && String(tipoCell.v).trim() === 'VARIANTE') {
          // Formatear filas de variantes con un estilo más sutil
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
            if (wsDetalle[cellAddress]) {
              wsDetalle[cellAddress].s = {
                font: { size: 10 },
                fill: { fgColor: { rgb: "F8FAFC" } }, // Fondo gris muy claro
                alignment: { horizontal: "left", vertical: "center" }
              };
            }
          }
        }
      }

      // Ajustar ancho de columnas para ambas hojas
      const colWidthsResumen = [
        { wch: 30 }, // Producto
        { wch: 25 }, // Categoría
        { wch: 15 }, // Código
        { wch: 15 }, // Cantidad
        { wch: 18 }, // Ingreso
        { wch: 18 }  // Precio
      ];
      wsResumen['!cols'] = colWidthsResumen;

      const colWidthsDetalle = [
        { wch: 12 }, // Tipo
        { wch: 40 }, // Nombre del Producto (más ancho para: producto - talla - color)
        { wch: 25 }, // Categoría
        { wch: 20 }, // Código de Barras
        { wch: 20 }, // Cantidad Total Vendida
        { wch: 20 }  // Ingresos Totales
      ];
      wsDetalle['!cols'] = colWidthsDetalle;

      // Generar nombre del archivo con información de filtros
      let nombreArchivo = 'productos_mas_vendidos';
      const fechaActual = new Date().toISOString().split('T')[0];
      
      if (fechaInicio && fechaFin) {
        nombreArchivo += `_${fechaInicio}_${fechaFin}`;
      }
      
      if (categoriaPadre) {
        const categoria = categorias.find(c => c.idCategoria?.toString() === categoriaPadre);
        if (categoria) {
          nombreArchivo += `_${categoria.nombre.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
      }
      
      nombreArchivo += `_${fechaActual}.xlsx`;

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
        <span>Reporte detallado exportado exitosamente</span>
      `;
      document.body.appendChild(successToast);
      
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 3000);

    } catch (error) {
      console.error('Error al exportar datos:', error);
      setAlertModal({ open: true, message: 'Error al generar el reporte. Inténtalo nuevamente.', variant: 'error' });
    }
  }, [productosFiltrados, categorias, fechaInicio, fechaFin, categoriaPadre]);

  useEffect(() => {
    setActions(
      <PageActionButton onClick={exportarDatos} disabled={loading || productosFiltrados.length === 0}>
        <ArrowDownTrayIcon className="h-4 w-4" />
        Exportar Excel
      </PageActionButton>
    );
  }, [setActions, exportarDatos, loading, productosFiltrados.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <ChartSkeleton />
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CubeIcon className="h-12 w-12 app-text-faint mx-auto mb-3" />
          <p className="app-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {insightProductos ? (
        <ReportInsightBanner message={insightProductos} headline="Mix de productos" icon="inventory_2" />
      ) : null}

      <DashboardPanel className="!p-5 sm:!p-6 relative z-20">
        <h3 className="text-base font-black app-heading mb-4">Filtros de Búsqueda</h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Categoría Principal */}
          <div className="relative" ref={categoriaRef}>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
              Categoría Principal
            </label>
            <div className="relative">
              <input
                id="searchCategoria"
                type="text"
                placeholder={categoriaPadre ? "Categoría seleccionada" : "Buscar categoría principal..."}
                value={searchCategoria}
                onChange={(e) => setSearchCategoria(e.target.value)}
                onFocus={() => setIsCategoriaFocused(true)}
                onBlur={() => setTimeout(() => setIsCategoriaFocused(false), 200)}
                className={`w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] ${
                  (isCategoriaFocused || searchCategoria) && !categoriaPadre 
                    ? 'border-blue-300 shadow-md bg-blue-50/30' 
                    : ''
                }`}
                disabled={!!categoriaPadre}
              />
              {searchCategoria && !categoriaPadre && (
                <div className="absolute right-3 top-3 text-xs text-[var(--app-accent)] bg-[var(--app-panel)] px-2 py-1 rounded-full shadow-sm border border-[var(--app-border)]">
                  {categoriasFiltradas.length} resultado{categoriasFiltradas.length !== 1 ? 's' : ''}
                </div>
              )}
              {categoriaPadre && !searchCategoria && (
                <div className="absolute inset-0 px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl flex items-center justify-between shadow-md">
                  <span className="text-blue-800 font-bold text-sm truncate">
                    {categorias.find(c => c.idCategoria?.toString() === categoriaPadre)?.nombre}
                  </span>
                  <button
                    onClick={limpiarSeleccionCategoria}
                    className="text-blue-600 hover:text-blue-800 ml-2 p-1 hover:bg-blue-200 rounded-full transition-all duration-200 shrink-0"
                    title="Limpiar selección"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {(isCategoriaFocused || searchCategoria) && !categoriaPadre && (
              <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-y-auto p-2 animate-fadeIn max-h-48">
                {categoriasFiltradas.length > 0 ? (
                  categoriasFiltradas.map((categoria) => (
                    <button
                      key={categoria.idCategoria}
                      onClick={() => {
                        setCategoriaPadre(categoria.idCategoria?.toString() || '');
                        setSearchCategoria('');
                        setIsCategoriaFocused(false);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium hover:bg-app-hover-overlay text-app-text"
                    >
                      {categoria.nombre}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-1">No se encontraron categorías</p>
                    <p className="text-xs text-gray-500">Intenta con otro término de búsqueda</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha inicio */}
          <DatePickerPopover
            label="Fecha inicio"
            value={fechaInicio}
            onChange={setFechaInicio}
          />

          {/* Fecha fin */}
          <DatePickerPopover
            label="Fecha fin"
            value={fechaFin}
            onChange={setFechaFin}
            min={fechaInicio}
          />

          {/* Limpiar */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3 invisible">
              _
            </label>
            <button
              onClick={(e) => { e.stopPropagation(); limpiarFiltros(); }}
              className="w-full inline-flex min-h-12 lg:h-12 items-center justify-center gap-2 px-6 lg:px-8 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-200 app-btn-primary shadow-sm"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mr-2">
            Filtros rápidos
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('hoy'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('semana'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Ultimos 7 dias
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('mes'); }}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] hover:bg-[var(--app-hover-overlay)] transition-colors"
          >
            Ultimos 30 dias
          </button>
        </div>
      </DashboardPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardMetricCard label="En ranking" value={productosFiltrados.length} icon="inventory_2" iconIndex={1} />
        <DashboardMetricCard
          label="Unidades"
          value={productosFiltrados.reduce((sum, p) => sum + p.cantidadVendida, 0)}
          icon="shopping_bag"
          iconIndex={2}
        />
        <DashboardMetricCard
          label="Ingresos"
          value={`S/ ${productosFiltrados.reduce((sum, p) => sum + p.ingresosTotales, 0).toLocaleString('es-PE')}`}
          icon="payments"
          iconIndex={3}
        />
        <DashboardMetricCard
          label="Precio prom."
          value={`S/ ${
            productosFiltrados.length > 0
              ? (productosFiltrados.reduce((sum, p) => sum + p.precioPromedio, 0) / productosFiltrados.length).toFixed(0)
              : '0'
          }`}
          icon="sell"
          iconIndex={4}
        />
      </div>

      {/* Tipo de Análisis */}
      <DashboardPanel className="relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">TIPO DE ANÁLISIS</h3>
        </div>
        <div className="mt-3 relative" ref={tipoAnalisisRef}>
          <div
            className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer select-none"
            onClick={() => setIsTipoAnalisisOpen(!isTipoAnalisisOpen)}
          >
            <span>{tipoAnalisis === 'ranking' ? 'Ranking de más y menos vendidos' : 'Análisis individual'}</span>
            <svg className={`w-4 h-4 transition-transform duration-200 ${isTipoAnalisisOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {isTipoAnalisisOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-app-surface border border-app-border rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${tipoAnalisis === 'ranking' ? 'bg-app-accent text-app-accent-fg' : 'text-app-text hover:bg-app-hover-overlay'}`}
                onClick={() => { setTipoAnalisis('ranking'); setIsTipoAnalisisOpen(false); }}
              >
                Ranking de más y menos vendidos
              </button>
              <button
                className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${tipoAnalisis === 'individual' ? 'bg-app-accent text-app-accent-fg' : 'text-app-text hover:bg-app-hover-overlay'}`}
                onClick={() => { setTipoAnalisis('individual'); setIsTipoAnalisisOpen(false); }}
              >
                Análisis individual
              </button>
            </div>
          )}
        </div>
      </DashboardPanel>

      {tipoAnalisis === 'ranking' && (
        <div className="flex justify-end">
          <ReportViewPills options={VISTAS_PRODUCTOS_RANKING} value={vistaGrafico} onChange={setVistaGrafico} />
        </div>
      )}

      {tipoAnalisis === 'ranking' && vistaGrafico === 'barras' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Más Vendidos */}
          <DashboardPanel>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-black app-heading">Top 5 más vendidos</h3>
                <p className="text-xs app-text-muted mt-0.5">Productos con mayor volumen de ventas</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                Líderes
              </span>
            </div>

            {top5.length > 0 ? (
              <>
                <div className="h-44 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={top5}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nombreProducto" hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar
                        dataKey="cantidadVendida"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      >
                        {top5.map((_entry, index) => {
                          const colors = ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af'];
                          return <Cell key={`cell-${index}`} fill={colors[index] || '#4f46e5'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {top5.map((producto, index) => (
                    <div key={producto.idProducto} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3 overflow-hidden mr-2">
                        <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate" title={producto.nombreProducto}>
                          {producto.nombreProducto}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className="text-xs text-gray-500">{producto.cantidadVendida} uds</span>
                        <span className="text-sm font-semibold text-gray-900">S/ {producto.ingresosTotales.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No hay datos disponibles
              </div>
            )}
          </DashboardPanel>

          {/* Bottom 5 Menos Vendidos */}
          <DashboardPanel>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900">5 Menos Vendidos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Productos con menor rotación de inventario</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                Revisión
              </span>
            </div>

            {bottom5.length > 0 ? (
              <>
                <div className="h-44 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={bottom5}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nombreProducto" hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar
                        dataKey="cantidadVendida"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      >
                        {bottom5.map((_entry, index) => {
                          const coralColors = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6'];
                          return <Cell key={`cell-${index}`} fill={coralColors[index] || '#f43f5e'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {bottom5.map((producto, index) => (
                    <div key={producto.idProducto} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3 overflow-hidden mr-2">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                          {productosFiltrados.length - bottom5.length + index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate" title={producto.nombreProducto}>
                          {producto.nombreProducto}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className="text-xs text-gray-500">{producto.cantidadVendida} uds</span>
                        <span className="text-sm font-semibold text-gray-900">S/ {producto.ingresosTotales.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                {productosFiltrados.length <= 5 
                  ? "Se requieren más de 5 productos para mostrar el ranking inferior" 
                  : "No hay datos disponibles"}
              </div>
            )}
          </DashboardPanel>
        </div>
      )}

      {tipoAnalisis === 'ranking' && vistaGrafico === 'linea' && (
        <DashboardPanel>
          <SectionHeader title="Ingresos por producto (top 10)" />
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productosFiltrados.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="colorIngresosArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--app-chart-gradient-start)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--app-chart-gradient-end)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="nombreProducto" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={reportChartAxisTick}
                />
                <YAxis tickLine={false} axisLine={false} tick={reportChartAxisTick} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ingresosTotales"
                  stroke="var(--app-accent)"
                  strokeWidth={2}
                  fill="url(#colorIngresosArea)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      )}

      {vistaGrafico === 'tabla' && (
        <DashboardPanel className="overflow-hidden p-0">
          {tipoAnalisis === 'individual' && (
            <div className="px-6 pt-6 pb-2 space-y-4">
              <h3 className="text-base font-black app-heading">ANÁLISIS INDIVIDUAL DE PRODUCTO</h3>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 app-text-faint pointer-events-none" />
                <input
                  type="search"
                  placeholder="Buscar producto por nombre o código..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] app-heading text-sm"
                />
              </div>
            </div>
          )}
          <div className="overflow-x-auto p-6">
            <div className="mb-4">
              <h4 className="text-[10px] font-black uppercase tracking-wider app-text-faint">
                {tipoAnalisis === 'individual' ? 'Resultados de Búsqueda' : 'Ranking Completo'}
              </h4>
            </div>
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-bg-muted)]">
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {productosFiltrados.map((producto, index) => (
                  <tr key={producto.idProducto} className="hover:bg-[color-mix(in_srgb,var(--app-accent)_4%,transparent)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-[var(--app-bg-muted)] border border-[var(--app-border)] rounded-full flex items-center justify-center">
                          <span className="text-[var(--app-accent)] font-black text-xs">{index + 1}</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-bold text-[var(--app-text)]">{producto.nombreProducto}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] border border-[var(--app-border)] rounded-lg">
                        {formatearCategoriaCompleta(producto)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-[var(--app-text)]">{producto.cantidadVendida}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-[var(--app-text-muted)]">S/. {producto.ingresosTotales.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-[var(--app-text-muted)]">S/. {producto.precioPromedio}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-[var(--app-text-muted)]">{producto.codigoIdentificacion}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => seleccionarProducto(producto)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 app-btn-primary rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0"
                        title="Análisis detallado por tallas y colores"
                      >
                        Analizar
                        <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      )}

      {/* Panel de análisis detallado */}
      {mostrarAnalisisDetallado && productoSeleccionado && (
        <div ref={analisisDetalladoRef} className={`mt-8 ${isClosingDetallado ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in fade-in slide-in-from-bottom-4'} transform transition-all duration-300 ease-out`}>
          <DashboardPanel className="p-6">
            <div className="flex justify-between items-center mb-8 border-b border-[var(--app-border)] pb-4">
              <div className="transform transition-all duration-300 ease-out">
                <h3 className="text-base font-black app-heading uppercase tracking-wider">
                  ANÁLISIS DETALLADO DEL PRODUCTO <span className="text-[var(--app-accent)]">{productoSeleccionado.nombreProducto}</span>
                </h3>
              </div>
              <button
                onClick={cerrarAnalisisDetallado}
                className="app-text-muted hover:text-[var(--app-text)] transition-all duration-300 ease-out p-2 rounded-full hover:bg-[var(--app-bg-hover)] hover:scale-110 transform"
                aria-label="Cerrar análisis detallado"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sección de tallas */}
            <div className="mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-wider app-text-faint mb-4">Selecciona una talla para ver variantes por color:</h4>
              {loadingTallas ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)]"></div>
                  <span className="ml-2 app-text-muted text-sm font-bold">Cargando tallas...</span>
                </div>
              ) : tallasProducto.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tallasProducto.map((talla, index) => (
                    <button
                      key={`${talla.nombreTalla}-${index}`}
                      onClick={() => seleccionarTalla(talla.nombreTalla)}
                      className={`p-3 rounded-xl border font-bold transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-sm ${
                        tallaSeleccionada === talla.nombreTalla
                          ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm'
                          : 'border-[var(--app-border)] bg-[var(--app-bg-muted)] app-text-muted hover:border-[var(--app-accent)] hover:text-[var(--app-text)]'
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeInUp 0.4s ease-out forwards'
                      }}
                    >
                      <div className="text-sm">{talla.nombreTalla}</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{talla.cantidadVariantes} variantes</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 app-text-faint">
                  <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold text-sm">No se encontraron tallas para este producto</p>
                </div>
              )}
            </div>

            {/* Sección de variantes por color */}
            {tallaSeleccionada && (
              <div className="transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black uppercase tracking-wider app-heading">
                    Variantes por color - Talla: <span className="text-[var(--app-accent)]">{tallasProducto.find(t => t.nombreTalla === tallaSeleccionada)?.nombreTalla}</span>
                  </h4>
                  {/* Selector de tipo de gráfico */}
                  <div className="flex bg-[var(--app-bg-muted)] border border-[var(--app-border)] rounded-xl p-1">
                    <button
                      onClick={() => setTipoGraficoVariantes('barras')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ease-out ${
                        tipoGraficoVariantes === 'barras'
                          ? 'bg-[var(--app-bg)] text-[var(--app-text)] shadow-sm'
                          : 'app-text-muted hover:text-[var(--app-text)]'
                      }`}
                    >
                      Barras
                    </button>
                    <button
                      onClick={() => setTipoGraficoVariantes('torta')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ease-out ${
                        tipoGraficoVariantes === 'torta'
                          ? 'bg-[var(--app-bg)] text-[var(--app-text)] shadow-sm'
                          : 'app-text-muted hover:text-[var(--app-text)]'
                      }`}
                    >
                      Torta
                    </button>
                  </div>
                </div>
                {/* Contenedor con altura fija para evitar saltos visuales */}
                <div className="min-h-[400px] relative">
                  {loadingVariantes && (
                    <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--app-bg)_85%,transparent)] backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)]"></div>
                        <span className="app-text-muted font-bold text-sm">Cargando variantes...</span>
                      </div>
                    </div>
                  )}
                  
                  {variantesPorColor.length > 0 ? (
                  <div className="space-y-6">
                    {/* Gráfico dinámico para variantes por color */}
                    <div className="bg-[var(--app-bg-muted)] rounded-2xl border border-[var(--app-border)] p-6">
                      <h5 className="text-[10px] font-black uppercase tracking-wider app-text-faint mb-4">Distribución por colores</h5>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficoVariantes === 'barras' ? (
                            <BarChart data={variantesPorColor.filter(v => v.cantidadVendida > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorVariantes" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.95}/>
                                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.4}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                              <XAxis 
                                dataKey="nombreColor" 
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                              />
                              <YAxis 
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                              />
                              <Tooltip content={<CustomTooltipVariantes />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
                              <Bar 
                                dataKey="cantidadVendida" 
                                fill="url(#colorVariantes)" 
                                name="Cantidad Vendida"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={40}
                              />
                            </BarChart>
                          ) : (
                            <PieChart>
                              <Pie
                                data={variantesPorColor.filter(v => v.cantidadVendida > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={CustomPieLabel}
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={4}
                                cornerRadius={5}
                                dataKey="cantidadVendida"
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              >
                                {variantesPorColor.filter(v => v.cantidadVendida > 0).map((entry, index) => (
                                  <Cell 
                                    key={`color-${entry.nombreColor}-${index}`} 
                                    fill={entry.hexColor || `hsl(${index * 45}, 70%, 60%)`}
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltipVariantes />} />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Tabla detallada */}
                    <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]">
                      <table className="min-w-full divide-y divide-[var(--app-border)]">
                        <thead className="bg-[var(--app-bg-muted)]">
                          <tr>
                            <th scope="col" className="w-1/3 px-6 py-4 text-left text-xs font-black text-[var(--app-text-secondary)] uppercase tracking-wider">
                              Color
                            </th>
                            <th scope="col" className="w-1/3 px-6 py-4 text-center text-xs font-black text-[var(--app-text-secondary)] uppercase tracking-wider">
                              Cant. Vendida
                            </th>
                            <th scope="col" className="w-1/3 px-6 py-4 text-right text-xs font-black text-[var(--app-text-secondary)] uppercase tracking-wider rounded-tr-lg">
                              Ingresos
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--app-border)]">
                          {variantesPorColor.map((variante, idx) => (
                            <tr 
                              key={`${variante.nombreColor}-${idx}`}
                              className={`
                                group transition-all duration-200
                                ${idx % 2 === 0 ? 'bg-[var(--app-bg-secondary)]' : 'bg-transparent'}
                                hover:bg-[var(--app-bg-hover)]
                              `}
                            >
                              <td className="w-1/3 px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-[var(--app-text-primary)]">
                                    {variante.nombreColor}
                                  </span>
                                </div>
                              </td>
                              <td className="w-1/3 px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold text-[var(--app-accent)] bg-[var(--app-accent)]/10 rounded-full">
                                  {variante.cantidadVendida}
                                </span>
                              </td>
                              <td className="w-1/3 px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-[var(--app-text-muted)]">
                                  S/. {parseFloat(variante.ingresosTotales.toString()).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  ) : (
                    <div className="text-center py-8 app-text-faint">
                      <CubeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-bold text-sm">No se encontraron variantes para esta talla</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DashboardPanel>
        </div>
      )}

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

export default ProductosMasVendidos;

// Estilos CSS para animaciones y scrollbar personalizado
const styles = `
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: linear-gradient(180deg, #f1f5f9, #e2e8f0);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #3b82f6, #1d4ed8);
    border-radius: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #1d4ed8, #1e40af);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  /* Scrollbar para Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #f1f5f9;
  }

  /* Animaciones adicionales para mejor UX */
  .animate-in {
    animation-fill-mode: both;
  }

  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .scale-in-95 {
    animation: scaleIn95 0.2s ease-out;
  }

  .slide-in-from-right-2 {
    animation: slideInFromRight2 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn95 {
    from { 
      opacity: 0; 
      transform: scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: scale(1); 
    }
  }

  @keyframes slideInFromRight2 {
    from { 
      opacity: 0; 
      transform: translateX(8px); 
    }
    to { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }

  /* Efecto de backdrop para el dropdown */
  .dropdown-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
    z-index: 40;
  }

  .dropdown-container {
    position: relative;
    z-index: 50;
  }

  .dropdown-container .dropdown-list {
    position: absolute !important;
    z-index: 50;
    top: 100% !important;
    left: 0 !important;
    right: 0 !important;
  }
`;

// Agregar estilos al documento si no existen
if (typeof document !== 'undefined' && !document.getElementById('productos-mas-vendidos-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'productos-mas-vendidos-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
