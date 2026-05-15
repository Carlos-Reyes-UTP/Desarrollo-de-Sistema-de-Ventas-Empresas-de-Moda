import apiClient from '../config/apiClient';
import { RUTAS_PRODUCTOS, RUTAS_VENTAS, RUTAS_DASHBOARD } from '../config/apiConfig';
import { ProductoService } from './ProductoService';
import type { 
  ProductoStats, 
  CategoriaDistribucion, 
  EstadoInventario, 
  ProductoInventario, 
  ActividadReciente
} from '../types/DashboardStats';
import type { Producto } from '../types/Producto';
import type { Venta } from '../types/Venta';

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

  // Obtener productos del inventario con estado (AHORA USANDO PAGINACIÓN)
  obtenerProductosInventario: async (limite: number = 20, busqueda?: string): Promise<ProductoInventario[]> => {
    try {
      // Usar endpoint paginado para no cargar 10,000 items en memoria para la lista
      const pagina = await ProductoService.getProductosPaginados(0, limite, busqueda, 'ROLE_ADMIN');
      const productos = pagina.content || [];
      
      return productos.map(producto => {
        let estado: 'normal' | 'bajo' | 'critico' | 'sin-stock';
        const stock = producto.cantidadTotal ?? producto.cantidad ?? 0;
        
        if (stock === 0) estado = 'sin-stock';
        else if (stock <= 5) estado = 'critico';
        else if (stock <= 15) estado = 'bajo';
        else estado = 'normal';

        const categoriaNombre = producto.categoriaPadre?.nombre ?? producto.categoria?.nombre ?? 'Sin categoría';
        
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
      const paginaCriticos = await ProductoService.getProductosPaginados(0, 5, '', 'ROLE_ADMIN');
      const productos = paginaCriticos.content || [];
      
      const productosCriticos = productos.filter(p => (p?.cantidadTotal ?? p?.cantidad ?? 0) <= 5);
      
      productosCriticos.slice(0, 2).forEach((producto, index) => {
        const stock = producto?.cantidadTotal ?? producto?.cantidad ?? 0;
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
