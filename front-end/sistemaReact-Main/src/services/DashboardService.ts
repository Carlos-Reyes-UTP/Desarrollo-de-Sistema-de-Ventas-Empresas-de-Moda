import apiClient from '../config/apiClient';
import { RUTAS_PRODUCTOS, RUTAS_VENTAS, RUTAS_DASHBOARD } from '../config/apiConfig';
import { ProductoService } from './ProductoService';
import type { 
  ProductoStats, 
  CategoriaDistribucion, 
  EstadoInventario, 
  ProductoInventario, 
  ActividadReciente,
  AlertaReposicion
} from '../types/DashboardStats';
import type { Producto } from '../types/Producto';
import type { Venta } from '../types/Venta';

/** Mismos umbrales que el backend (DashboardService / alertas de reposición en pisos). */
export const UMBRAL_CRITICO_INVENTARIO = 5;
export const UMBRAL_BAJO_INVENTARIO = 15;
export const UMBRAL_ALERTA_REPOSICION_PISO = 4;
/** Objetivo de stock en piso cuando el backend no define stock_maximo por fila. */
export const STOCK_OBJETIVO_PISO = 15;

export type EstadoStockProducto = 'normal' | 'bajo' | 'critico' | 'sin-stock';

export function clasificarEstadoStock(stock: number): EstadoStockProducto {
  if (stock === 0) return 'sin-stock';
  if (stock <= UMBRAL_CRITICO_INVENTARIO) return 'critico';
  if (stock <= UMBRAL_BAJO_INVENTARIO) return 'bajo';
  return 'normal';
}

/** Stock mostrado al almacenero: solo su almacén asignado (no cantidad global del catálogo). */
export function stockProductoParaAlmacenero(producto: Producto): number {
  return producto.stockAlmacen ?? producto.cantidad ?? 0;
}

function etiquetaCategoriaProducto(producto: Producto): string {
  const sub = producto.categoria?.nombre?.trim();
  const padre = producto.categoriaPadre?.nombre?.trim();
  if (sub && padre && sub.toLowerCase() !== padre.toLowerCase()) {
    return `${padre} · ${sub}`;
  }
  return sub || padre || producto.tipoPublico || 'Sin categoría';
}

export const DashboardService = {
  // Obtener estadísticas generales de productos (Server-Side)
  obtenerEstadisticasProductos: async (): Promise<ProductoStats> => {
    try {
      const response = await apiClient.get<ProductoStats>(RUTAS_DASHBOARD.ESTADISTICAS);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas de productos:', error);
      return { total: 0, bajoStock: 0, sinStock: 0, categorias: 0, ultimoMes: 0 };
    }
  },

  // Obtener distribución por categorías (Server-Side)
  obtenerDistribucionCategorias: async (): Promise<CategoriaDistribucion[]> => {
    try {
      const response = await apiClient.get<CategoriaDistribucion[]>(RUTAS_DASHBOARD.DISTRIBUCION_CATEGORIAS);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo distribución de categorías:', error);
      return [];
    }
  },

  // Obtener estado del inventario (Server-Side)
  obtenerEstadoInventario: async (): Promise<EstadoInventario> => {
    try {
      const response = await apiClient.get<EstadoInventario>(RUTAS_DASHBOARD.ESTADO_INVENTARIO);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado del inventario:', error);
      return { normal: 0, bajo: 0, critico: 0, sinStock: 0 };
    }
  },

  // Obtener alertas de reposición automática (stock ≤ 4 en pisos)
  obtenerAlertasReposicion: async (): Promise<AlertaReposicion[]> => {
    try {
      const response = await apiClient.get<AlertaReposicion[]>(RUTAS_DASHBOARD.ALERTAS_REPOSICION);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo alertas de reposición:', error);
      return [];
    }
  },

  // Reponer una alerta: crea solicitud de reposición desde almacén
  reponerAlerta: async (
    idVariante: number,
    idUbicacionArea: number,
    cantidad?: number
  ): Promise<void> => {
    const body =
      cantidad != null && cantidad > 0 ? { cantidad } : undefined;
    await apiClient.post(
      RUTAS_DASHBOARD.REPONER_ALERTA(idVariante, idUbicacionArea),
      body
    );
  },

  // Obtener productos del inventario con estado (AHORA USANDO PAGINACIÓN)
  obtenerProductosInventario: async (
    limite: number = 20,
    busqueda?: string,
    userRole: string = 'ROLE_ALMACENERO',
    sector?: string
  ): Promise<ProductoInventario[]> => {
    try {
      const pagina = await ProductoService.getProductosPaginados(0, limite, busqueda, userRole, sector);
      const productos = pagina.content || [];
      
      return productos.map(producto => {
        const stock = stockProductoParaAlmacenero(producto);
        const estado = clasificarEstadoStock(stock);
        const categoriaNombre = etiquetaCategoriaProducto(producto);

        return {
          idProducto: producto.idProducto ?? 0,
          nombre: producto.nombre,
          codigoIdentificacion: producto.codigoIdentificacion ?? '',
          categoria: categoriaNombre,
          stock: stock,
          estado,
          precioUnitario: producto.precioUnitario ?? 0,
          marca: producto.marca ?? '',
          proveedor: producto.proveedor?.nombre ?? 'Sin proveedor',
          fechaActualizacion: new Date().toLocaleDateString()
        };
      });
    } catch (error) {
      console.error('Error obteniendo productos del inventario:', error);
      return [];
    }
  },

  // Obtener actividad reciente
  obtenerActividadReciente: async (userRole?: string): Promise<ActividadReciente[]> => {
    try {
      const actividades: ActividadReciente[] = [];
      // Ya no pedimos los 10,000 productos. Si queremos stock crítico, podríamos hacer un endpoint paginado
      // o consultar solo 5. Por ahora lo simulamos con los primeros de la página para no romper el front
      const rol = userRole === 'ROLE_SUPERVISOR_ALMACEN' ? 'ROLE_SUPERVISOR_ALMACEN' : 'ROLE_ALMACENERO';
      const paginaCriticos = await ProductoService.getProductosPaginados(0, 5, '', rol);
      const productos = paginaCriticos.content || [];

      const productosCriticos = productos.filter(
        p => clasificarEstadoStock(stockProductoParaAlmacenero(p)) === 'critico'
      );

      productosCriticos.slice(0, 2).forEach((producto, index) => {
        const stock = stockProductoParaAlmacenero(producto);
        actividades.push({
          id: `stock-critico-${producto.idProducto}`,
          tipo: 'stock_critico',
          descripcion: 'Stock crítico detectado',
          detalles: `${producto.nombre} - Solo ${stock} unidades`,
          fecha: new Date(Date.now() - (index * 30 * 60 * 1000)).toISOString(),
        });
      });

      if (userRole === 'ROLE_CAJERO' || userRole === 'ROLE_ADMIN') {
        try {
          const ventasHoy = await apiClient.get<Venta[]>(RUTAS_VENTAS.POR_FECHA(new Date().toISOString().split('T')[0]));
          const ventasData = Array.isArray(ventasHoy.data) ? ventasHoy.data : [];
          if (ventasData.length > 0) {
            const ventaReciente = ventasData[0];
            actividades.push({
              id: `venta-${ventaReciente.idVenta}`,
              tipo: 'venta_realizada',
              descripcion: 'Venta registrada',
              detalles: `${ventaReciente.detalles?.length || 0} productos vendidos`,
              fecha: ventaReciente.fechaVenta || new Date().toISOString(),
            });
          }
        } catch (error) {
          console.log('No se pudieron obtener ventas recientes:', error);
        }
      }
      
      if (actividades.length === 0) {
        actividades.push({
          id: 'no-activity',
          tipo: 'producto_actualizado',
          descripcion: 'Sin actividad reciente',
          detalles: 'No hay actividades registradas en las últimas horas',
          fecha: new Date().toISOString(),
        });
      }
      
      return actividades.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error);
      return [];
    }
  },  // Actualizar stock de un producto
  actualizarStockProducto: async (idProducto: number, nuevaCantidad: number): Promise<Producto> => {
    try {
      // Primero obtener el producto actual
      const productoActual = await ProductoService.getProductoById(idProducto, 'ROLE_ADMIN');
      
      // Actualizar la cantidad
      const productoActualizado = {
        ...productoActual,
        cantidad: nuevaCantidad
      };
      
      // Enviar la actualización usando el endpoint directo ya que ProductoService no tiene update
      const response = await apiClient.put<Producto>(RUTAS_PRODUCTOS.POR_ID(idProducto), productoActualizado);
      
      return response.data;
    } catch (error) {
      console.error('Error actualizando stock del producto:', error);
      throw error;
    }
  }
};
