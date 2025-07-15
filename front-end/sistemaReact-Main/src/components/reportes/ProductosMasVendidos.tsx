import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { ReporteService } from '../../services/ReporteService';
import { ProductoVarianteService } from '../../services/ProductoVarianteService';
import type { ProductoMasVendido, TallaProducto, VariantesPorColor } from '../../interfaces/ReporteVentas';
import { CategoriaService } from '../../services/CategoriaServices';
import type { Categoria } from '../../interfaces/Categoria';

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

// Componente para tooltip personalizado de variantes por color
const CustomTooltipVariantes = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <h4 className="font-semibold text-gray-900 mb-2">{data.nombreColor}</h4>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Cantidad Vendida:</span> {data.cantidadVendida}</p>
          <p><span className="font-medium">Stock Actual:</span> {data.cantidadStock}</p>
          <p><span className="font-medium">Ingresos:</span> S/ {parseFloat(data.ingresosTotales).toLocaleString()}</p>
        </div>
      </div>
    );
  }
  return null;
};

// Componente para etiquetas personalizadas del gráfico de torta
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, nombreColor, cantidadVendida, percent }: any) => {
  // No mostrar etiqueta si no hay ventas
  if (!cantidadVendida || cantidadVendida === 0) return null;
  
  const RADIAN = Math.PI / 180;
  // Colocar el texto fuera del círculo
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#000000" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="14"
      fontWeight="600"
    >
      {`${nombreColor}: ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const ProductosMasVendidos: React.FC = () => {
  const [productos, setProductos] = useState<ProductoMasVendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'linea' | 'tabla'>('barras');
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaPadre, setCategoriaPadre] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState<{
    fechaInicio?: string;
    fechaFin?: string;
    categoriaPadre?: string;
  }>({});
  const [searchCategoria, setSearchCategoria] = useState<string>('');
  const [isCategoriaFocused, setIsCategoriaFocused] = useState(false);
  
  // Estados para el análisis detallado por producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoMasVendido | null>(null);
  const [tallasProducto, setTallasProducto] = useState<TallaProducto[]>([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<number | null>(null);
  const [variantesPorColor, setVariantesPorColor] = useState<VariantesPorColor[]>([]);
  const [mostrarAnalisisDetallado, setMostrarAnalisisDetallado] = useState(false);
  const [loadingTallas, setLoadingTallas] = useState(false);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [tipoGraficoVariantes, setTipoGraficoVariantes] = useState<'barras' | 'torta'>('barras');
  
  // Referencias para el campo de búsqueda
  const categoriaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    CategoriaService.obtenerCategoriasPrincipales().then(setCategorias);
  }, []);

  // Manejar clics fuera del componente de búsqueda para cerrar la lista
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriaRef.current && !categoriaRef.current.contains(event.target as Node)) {
        setSearchCategoria('');
        setIsCategoriaFocused(false);
      }
    };

    const handleScroll = () => {
      if (isCategoriaFocused || searchCategoria) {
        setSearchCategoria('');
        setIsCategoriaFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isCategoriaFocused, searchCategoria]);

  // Efecto optimizado para aplicar filtros - con mejor control de dependencias
  useEffect(() => {
    // Solo actualizar filtros aplicados si realmente cambió algo significativo
    const fechasCompletas = fechaInicio && fechaFin;
    const nuevosFiltos = {
      fechaInicio: fechasCompletas ? fechaInicio : '',
      fechaFin: fechasCompletas ? fechaFin : '',
      categoriaPadre: categoriaPadre || ''
    };
    
    // Prevenir actualizaciones innecesarias comparando valores actuales
    const hayDiferencias = 
      nuevosFiltos.fechaInicio !== (filtrosAplicados.fechaInicio || '') ||
      nuevosFiltos.fechaFin !== (filtrosAplicados.fechaFin || '') ||
      nuevosFiltos.categoriaPadre !== (filtrosAplicados.categoriaPadre || '');

    if (hayDiferencias) {
      setFiltrosAplicados(nuevosFiltos);
    }
    // Eliminamos filtrosAplicados de las dependencias para evitar bucles infinitos
  }, [fechaInicio, fechaFin, categoriaPadre]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setLoading(true);
        setError(null);
        let filtrosReporte: any = {};
        
        if (filtrosAplicados.categoriaPadre) {
          filtrosReporte.idCategoriaPadre = filtrosAplicados.categoriaPadre;
        }
        
        if (filtrosAplicados.fechaInicio && filtrosAplicados.fechaFin) {
          // Convertir fechas a formato ISO con hora
          const fechaInicioISO = new Date(filtrosAplicados.fechaInicio + 'T00:00:00').toISOString();
          const fechaFinISO = new Date(filtrosAplicados.fechaFin + 'T23:59:59').toISOString();
          filtrosReporte.fechaInicio = fechaInicioISO;
          filtrosReporte.fechaFin = fechaFinISO;
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
    
    // Solo cargar si hay cambios en los filtros o es la primera carga
    cargarProductos();
    
  }, [JSON.stringify(filtrosAplicados)]); // Usar JSON.stringify para comparación profunda

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

  // Función para limpiar la selección de categoría
  const limpiarSeleccionCategoria = () => {
    setCategoriaPadre('');
    setSearchCategoria('');
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setCategoriaPadre('');
    setFechaInicio('');
    setFechaFin('');
    setBusqueda('');
    setSearchCategoria('');
    setFiltrosAplicados({});
    // No cerramos el panel de filtros automáticamente
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

  const seleccionarTalla = async (idTalla: number) => {
    if (!productoSeleccionado) return;
    
    // Actualizar la talla seleccionada inmediatamente para mostrar feedback visual
    setTallaSeleccionada(idTalla);
    
    try {
      setLoadingVariantes(true);
      // Mantener las variantes anteriores mientras carga para evitar parpadeo
      const variantes = await ReporteService.getVariantesPorColor(productoSeleccionado.idProducto, idTalla);
      setVariantesPorColor(variantes);
    } catch (error) {
      console.error('Error al cargar variantes por color:', error);
      setVariantesPorColor([]);
    } finally {
      setLoadingVariantes(false);
    }
  };

  const cerrarAnalisisDetallado = () => {
    setMostrarAnalisisDetallado(false);
    setProductoSeleccionado(null);
    setTallasProducto([]);
    setTallaSeleccionada(null);
    setVariantesPorColor([]);
  };

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

  const exportarDatos = async () => {
    if (productosFiltrados.length === 0) {
      alert('No hay datos para exportar');
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
        datosDetallados.push({
          'Tipo': 'PRODUCTO',
          'Nombre del Producto': producto.nombreProducto,
          'Categoría': formatearCategoriaCompleta(producto),
          'Código de Barras': producto.codigoIdentificacion,
          'Stock Actual': '', // Se calculará el total después
          'Cantidad Total Vendida': producto.cantidadVendida,
          'Ingresos Totales (S/)': producto.ingresosTotales
        });

        let stockTotalProducto = 0; // Para calcular el stock total del producto

        try {
          // Obtener tallas del producto
          const tallas = await ReporteService.getTallasPorProducto(producto.idProducto);
          
          for (const talla of tallas) {
            try {
              // Obtener variantes por color para cada talla
              const variantes = await ReporteService.getVariantesPorColor(producto.idProducto, talla.idTalla);
              
              for (const variante of variantes) {
                stockTotalProducto += variante.cantidadStock; // Sumar al stock total
                
                // Obtener información completa de la variante para el código de barras
                let codigoBarras = 'Sin código';
                try {
                  const varianteCompleta = await ProductoVarianteService.obtenerVariantePorProductoTallaColor(
                    producto.idProducto, 
                    talla.idTalla, 
                    variante.idColor
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
                  'Stock Actual': variante.cantidadStock,
                  'Cantidad Total Vendida': variante.cantidadVendida,
                  'Ingresos Totales (S/)': parseFloat(variante.ingresosTotales.toString())
                });
              }
            } catch (error) {
              console.warn(`Error al cargar variantes para talla ${talla.nombreTalla}:`, error);
            }
          }

          // Actualizar el stock total en la fila del producto principal
          if (datosDetallados.length > 0) {
            const filaProducto = datosDetallados.find(fila => 
              fila.Tipo === 'PRODUCTO' && fila['Nombre del Producto'] === producto.nombreProducto
            );
            if (filaProducto) {
              filaProducto['Stock Actual'] = stockTotalProducto;
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
          'Stock Actual': '',
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
        { wch: 15 }, // Stock Actual
        { wch: 20 }, // Cantidad Total Vendida
        { wch: 20 }  // Ingresos Totales
      ];
      wsDetalle['!cols'] = colWidthsDetalle;

      // Generar nombre del archivo con información de filtros
      let nombreArchivo = 'productos_mas_vendidos';
      const fechaActual = new Date().toISOString().split('T')[0];
      
      if (filtrosAplicados.fechaInicio && filtrosAplicados.fechaFin) {
        nombreArchivo += `_${filtrosAplicados.fechaInicio}_${filtrosAplicados.fechaFin}`;
      }
      
      if (filtrosAplicados.categoriaPadre) {
        const categoria = categorias.find(c => c.idCategoria?.toString() === filtrosAplicados.categoriaPadre);
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
      alert('Error al generar el reporte. Inténtalo nuevamente.');
    }
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
            {(filtrosAplicados.fechaInicio || filtrosAplicados.fechaFin || filtrosAplicados.categoriaPadre) && !mostrarFiltros && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                !
              </span>
            )}
          </button>
          <button
            onClick={exportarDatos}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Exportar reporte detallado con variantes por talla y color"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Exportar Detallado
          </button>
        </div>
      </div>

      {/* Panel de filtros expandible con animación */}
      <div className={`transition-all duration-500 ease-out ${
        mostrarFiltros 
          ? 'max-h-screen opacity-100 transform translate-y-0' 
          : 'max-h-0 opacity-0 transform -translate-y-2 overflow-hidden'
      }`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transform transition-all duration-300 ease-out relative">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 relative"
               style={{ zIndex: 1 }}>
            {/* Campo de búsqueda de categorías - optimizado */}
            <div className="relative h-[4.5rem]" ref={categoriaRef} style={{ zIndex: 10 }}>
              <label htmlFor="searchCategoria" className="block text-sm font-medium text-gray-700 mb-2">
                🗂️ Categoría Principal
              </label>
              <div className="relative">
                <input
                  id="searchCategoria"
                  type="text"
                  placeholder={categoriaPadre ? "Categoría seleccionada" : "Buscar categoría principal..."}
                  value={searchCategoria}
                  onChange={(e) => setSearchCategoria(e.target.value)}
                  onFocus={() => setIsCategoriaFocused(true)}
                  onBlur={() => setTimeout(() => setIsCategoriaFocused(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchCategoria('');
                    } else if (e.key === 'Enter' && categoriasFiltradas.length === 1) {
                      setCategoriaPadre(categoriasFiltradas[0].idCategoria?.toString() || '');
                      setSearchCategoria('');
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={!!categoriaPadre}
                />
                
                {/* Indicador de resultados */}
                {searchCategoria && !categoriaPadre && (
                  <div className="absolute right-3 top-2.5 text-xs text-gray-500 bg-white px-1">
                    {categoriasFiltradas.length} resultado{categoriasFiltradas.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Mostrar categoría seleccionada - con posición corregida */}
                {categoriaPadre && !searchCategoria && (
                  <div className="absolute inset-0 px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-between">
                    <span className="text-blue-800 font-medium text-sm">
                      {categorias.find(c => c.idCategoria?.toString() === categoriaPadre)?.nombre}
                    </span>
                    <button
                      onClick={limpiarSeleccionCategoria}
                      className="text-blue-600 hover:text-blue-800 ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
                      title="Limpiar selección"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              
              {/* Lista desplegable de categorías filtradas */}
              {(isCategoriaFocused || searchCategoria) && !categoriaPadre && categoriasFiltradas.length > 0 && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
                     style={{ 
                       position: 'absolute',
                       top: '100%',
                       left: 0,
                       right: 0,
                       zIndex: 9999,
                       backgroundColor: 'rgba(255, 255, 255, 0.98)',
                       backdropFilter: 'blur(8px)',
                       boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                     }}>
                  {categoriasFiltradas.map(categoria => (
                    <button
                      key={categoria.idCategoria}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCategoriaPadre(categoria.idCategoria?.toString() || '');
                        setSearchCategoria('');
                        setIsCategoriaFocused(false);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCategoriaPadre(categoria.idCategoria?.toString() || '');
                          setSearchCategoria('');
                          setIsCategoriaFocused(false);
                        }
                      }}
                      className="w-full px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 text-left focus:outline-none focus:bg-blue-50 transition-colors duration-150"
                    >
                      <span className="font-medium text-gray-900">{categoria.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mensaje cuando no hay resultados */}
              {searchCategoria && categoriasFiltradas.length === 0 && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl p-3 text-center text-gray-500 text-sm"
                     style={{ 
                       position: 'absolute',
                       top: '100%',
                       left: 0,
                       right: 0,
                       zIndex: 9999,
                       backgroundColor: 'rgba(255, 255, 255, 0.98)',
                       backdropFilter: 'blur(8px)',
                       boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                     }}>
                  No se encontraron categorías
                </div>
              )}
            </div>
            
            {/* Filtros de fecha */}
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha de inicio
              </label>
              <input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                title="Selecciona la fecha de inicio para filtrar los datos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha de fin
              </label>
              <input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                title="Selecciona la fecha de fin para filtrar los datos"
                min={fechaInicio || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Botón para aplicar filtros de fechas manualmente */}
          {(fechaInicio || fechaFin) && (fechaInicio !== filtrosAplicados.fechaInicio || fechaFin !== filtrosAplicados.fechaFin) && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setFiltrosAplicados(prev => ({
                    ...prev,
                    fechaInicio,
                    fechaFin
                  }));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔄 Aplicar filtros de fecha
              </button>
            </div>
          )}

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
          {(filtrosAplicados.fechaInicio || filtrosAplicados.fechaFin || filtrosAplicados.categoriaPadre) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800">Filtros aplicados:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filtrosAplicados.fechaInicio && (
                  <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium shadow-sm">
                    📅 Desde: {filtrosAplicados.fechaInicio}
                  </span>
                )}
                {filtrosAplicados.fechaFin && (
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium shadow-sm">
                    📅 Hasta: {filtrosAplicados.fechaFin}
                  </span>
                )}
                {filtrosAplicados.categoriaPadre && (
                  <span className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium shadow-sm">
                    🏷️ {categorias.find(c => c.idCategoria?.toString() === filtrosAplicados.categoriaPadre)?.nombre}
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
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
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => seleccionarProducto(producto)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        title="Análisis detallado por tallas y colores"
                      >
                        📊 Analizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel de análisis detallado */}
      {mostrarAnalisisDetallado && productoSeleccionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <div className="transform transition-all duration-300 ease-out">
              <h3 className="text-xl font-bold text-gray-900">📊 Análisis Detallado</h3>
              <p className="text-lg text-gray-600 mt-1">
                Producto: <span className="font-semibold text-blue-600">{productoSeleccionado.nombreProducto}</span>
              </p>
            </div>
            <button
              onClick={cerrarAnalisisDetallado}
              className="text-gray-400 hover:text-gray-600 transition-all duration-300 ease-out p-2 rounded-full hover:bg-gray-100 hover:scale-110 transform"
              aria-label="Cerrar análisis detallado"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sección de tallas */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">👕 Selecciona una talla para ver variantes por color:</h4>
            {loadingTallas ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando tallas...</span>
              </div>
            ) : tallasProducto.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tallasProducto.map((talla, index) => (
                  <button
                    key={talla.idTalla}
                    onClick={() => seleccionarTalla(talla.idTalla)}
                    className={`p-3 rounded-lg border-2 font-medium transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-md ${
                      tallaSeleccionada === talla.idTalla
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-105'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards'
                    }}
                  >
                    <div className="text-sm font-bold">{talla.nombreTalla}</div>
                    <div className="text-xs text-gray-500">{talla.cantidadVariantes} variantes</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CubeIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No se encontraron tallas para este producto</p>
              </div>
            )}
          </div>

          {/* Sección de variantes por color */}
          {tallaSeleccionada && (
            <div className="transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  🎨 Variantes por color - Talla: {tallasProducto.find(t => t.idTalla === tallaSeleccionada)?.nombreTalla}
                </h4>
                {/* Selector de tipo de gráfico */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTipoGraficoVariantes('barras')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ease-out ${
                      tipoGraficoVariantes === 'barras'
                        ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Barras
                  </button>
                  <button
                    onClick={() => setTipoGraficoVariantes('torta')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ease-out ${
                      tipoGraficoVariantes === 'torta'
                        ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Torta
                  </button>
                </div>
              </div>
              {/* Contenedor con altura fija para evitar saltos visuales */}
              <div className="min-h-[400px] relative">
                {loadingVariantes && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-gray-700 font-medium">Cargando variantes...</span>
                    </div>
                  </div>
                )}
                
                {variantesPorColor.length > 0 ? (
                <div className="space-y-4">
                  {/* Gráfico dinámico para variantes por color */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-md font-medium text-gray-800 mb-3">Distribución por colores</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {tipoGraficoVariantes === 'barras' ? (
                          <BarChart data={variantesPorColor.filter(v => v.cantidadVendida > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nombreColor" />
                            <YAxis />
                            <Tooltip content={<CustomTooltipVariantes />} />
                            <Bar dataKey="cantidadVendida" fill="#3B82F6" name="Cantidad Vendida" />
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Pie
                              data={variantesPorColor.filter(v => v.cantidadVendida > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={<CustomPieLabel />}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="cantidadVendida"
                            >
                              {variantesPorColor.filter(v => v.cantidadVendida > 0).map((entry, index) => (
                                <Cell 
                                  key={`color-${entry.idColor}`} 
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Actual
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad Vendida
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingresos Totales
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {variantesPorColor.map((variante) => (
                          <tr key={variante.idColor} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div 
                                  className="flex-shrink-0 h-4 w-4 rounded-full mr-3 border border-gray-300"
                                  style={{ 
                                    backgroundColor: variante.hexColor || '#gray-300'
                                  }}
                                ></div>
                                <span className="text-sm font-medium text-gray-900">{variante.nombreColor}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {variante.cantidadStock}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {variante.cantidadVendida}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              S/ {parseFloat(variante.ingresosTotales.toString()).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CubeIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron variantes para esta talla</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductosMasVendidos;
