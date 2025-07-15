import apiClient from '../config/apiClient';
import { RUTAS_REPORTES } from '../config/apiConfig';
import type {
  ProductoMasVendido,
  ReporteCategoriaData,
  FiltrosReporte,
  ResumenGeneralVentas,
  ProductoDetalleVenta,
  VentasPorPeriodo,
  TallaProducto,
  VariantesPorColor
} from '../interfaces/ReporteVentas';

export const ReporteService = {
  
  /**
   * Obtiene los productos más vendidos con filtros opcionales
   */
  getProductosMasVendidos: async (filtros?: FiltrosReporte): Promise<ProductoMasVendido[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros?.categoria) params.append('categoria', filtros.categoria);
      if (filtros?.subcategoria) params.append('subcategoria', filtros.subcategoria);
      if (filtros?.proveedor) params.append('proveedor', filtros.proveedor);
      if (filtros?.idVendedor) params.append('idVendedor', filtros.idVendedor.toString());
      if (filtros?.metodoPago) params.append('metodoPago', filtros.metodoPago);
      if (filtros?.tipoCliente) params.append('tipoCliente', filtros.tipoCliente);
      if (filtros?.limite) params.append('limite', filtros.limite.toString());
      if (filtros?.idCategoriaPadre) params.append('idCategoriaPadre', filtros.idCategoriaPadre);
      
      const url = params.toString() 
        ? `${RUTAS_REPORTES.PRODUCTOS_MAS_VENDIDOS}?${params.toString()}`
        : RUTAS_REPORTES.PRODUCTOS_MAS_VENDIDOS;
        
      const response = await apiClient.get<ProductoMasVendido[]>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener productos más vendidos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar los productos más vendidos');
    }
  },

  /**
   * Obtiene el reporte de ventas por categoría
   */
  getReportePorCategoria: async (filtros?: FiltrosReporte): Promise<ReporteCategoriaData[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros?.categoria) params.append('categoria', filtros.categoria);
      if (filtros?.subcategoria) params.append('subcategoria', filtros.subcategoria);
      
      const url = params.toString() 
        ? `${RUTAS_REPORTES.POR_CATEGORIA}?${params.toString()}`
        : RUTAS_REPORTES.POR_CATEGORIA;
        
      const response = await apiClient.get<ReporteCategoriaData[]>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener reporte por categoría:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el reporte por categoría');
    }
  },

  /**
   * Obtiene el resumen general de ventas
   */
  getResumenGeneral: async (filtros?: FiltrosReporte): Promise<ResumenGeneralVentas> => {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      
      const url = params.toString() 
        ? `${RUTAS_REPORTES.RESUMEN_GENERAL}?${params.toString()}`
        : RUTAS_REPORTES.RESUMEN_GENERAL;
        
      const response = await apiClient.get<any>(url);
      
      // El endpoint /resumen-completo devuelve productos y categorías
      // Vamos a calcular métricas básicas desde estos datos
      const data = response.data;
      const productos = data.productosMasVendidos || [];
      const categorias = data.reportePorCategoria || [];
      
      const totalIngresos = productos.reduce((sum: number, p: any) => sum + (p.ingresosTotales || 0), 0);
      const totalVentas = productos.reduce((sum: number, p: any) => sum + (p.cantidadVendida || 0), 0);
      
      const resumen: ResumenGeneralVentas = {
        totalProductosVendidos: productos.length,
        totalIngresos,
        totalVentas,
        promedioVentaPorDia: totalIngresos / 30, // Estimación aproximada
        categoriaTopVentas: categorias.length > 0 ? categorias[0]?.categoria || 'Sin categoría' : 'Sin categoría',
        colorMasVendido: 'N/A',
        tallaMasVendida: 'N/A',
        periodoAnalizado: {
          fechaInicio: filtros?.fechaInicio || 'N/A',
          fechaFin: filtros?.fechaFin || 'N/A',
          dias: 30
        }
      };
      
      return resumen;
    } catch (error: any) {
      console.error('Error al obtener resumen general:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el resumen general');
    }
  },

  /**
   * Obtiene las ventas por período (para gráficos de tendencias)
   */
  getVentasPorPeriodo: async (filtros?: FiltrosReporte): Promise<VentasPorPeriodo[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      
      const url = params.toString() 
        ? `${RUTAS_REPORTES.VENTAS_POR_PERIODO}?${params.toString()}`
        : RUTAS_REPORTES.VENTAS_POR_PERIODO;
        
      const response = await apiClient.get<VentasPorPeriodo[]>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener ventas por período:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar las ventas por período');
    }
  },

  /**
   * Obtiene el detalle de productos vendidos (nivel variante)
   */
  getProductosDetalle: async (filtros?: FiltrosReporte): Promise<ProductoDetalleVenta[]> => {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros?.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros?.categoria) params.append('categoria', filtros.categoria);
      if (filtros?.subcategoria) params.append('subcategoria', filtros.subcategoria);
      if (filtros?.limite) params.append('limite', filtros.limite.toString());
      
      const url = params.toString() 
        ? `${RUTAS_REPORTES.PRODUCTOS_DETALLE}?${params.toString()}`
        : RUTAS_REPORTES.PRODUCTOS_DETALLE;
        
      const response = await apiClient.get<ProductoDetalleVenta[]>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener detalle de productos:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el detalle de productos');
    }
  },

  /**
   * Utilidades para generar filtros de fecha comunes
   */
  filtrosFecha: {
    hoy: (): Pick<FiltrosReporte, 'fechaInicio' | 'fechaFin'> => {
      const hoy = new Date().toISOString().split('T')[0];
      return { fechaInicio: hoy, fechaFin: hoy };
    },
    
    ultimaSemana: (): Pick<FiltrosReporte, 'fechaInicio' | 'fechaFin'> => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(fin.getDate() - 7);
      return {
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: fin.toISOString().split('T')[0]
      };
    },
    
    ultimoMes: (): Pick<FiltrosReporte, 'fechaInicio' | 'fechaFin'> => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setMonth(fin.getMonth() - 1);
      return {
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: fin.toISOString().split('T')[0]
      };
    },
    
    ultimoTrimestre: (): Pick<FiltrosReporte, 'fechaInicio' | 'fechaFin'> => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setMonth(fin.getMonth() - 3);
      return {
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: fin.toISOString().split('T')[0]
      };
    },
    
    esteAno: (): Pick<FiltrosReporte, 'fechaInicio' | 'fechaFin'> => {
      const ano = new Date().getFullYear();
      return {
        fechaInicio: `${ano}-01-01`,
        fechaFin: `${ano}-12-31`
      };
    }
  },

  /**
   * Obtiene las tallas disponibles para un producto específico
   */
  getTallasPorProducto: async (idProducto: number): Promise<TallaProducto[]> => {
    try {
      const response = await apiClient.get<TallaProducto[]>(
        `${RUTAS_REPORTES.PRODUCTOS_MAS_VENDIDOS.replace('/productos-mas-vendidos', '/producto/tallas')}?idProducto=${idProducto}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener tallas del producto:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar las tallas del producto');
    }
  },

  /**
   * Obtiene las variantes agrupadas por color para un producto y talla específicos
   */
  getVariantesPorColor: async (idProducto: number, idTalla: number): Promise<VariantesPorColor[]> => {
    try {
      const response = await apiClient.get<VariantesPorColor[]>(
        `${RUTAS_REPORTES.PRODUCTOS_MAS_VENDIDOS.replace('/productos-mas-vendidos', '/producto/variantes-por-color')}?idProducto=${idProducto}&idTalla=${idTalla}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener variantes por color:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar las variantes por color');
    }
  }
};
