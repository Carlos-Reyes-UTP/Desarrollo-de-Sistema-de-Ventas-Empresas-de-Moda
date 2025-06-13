import apiClient from '../config/apiClient';
import { RUTAS_PRODUCTOS, RUTAS_VENTAS } from '../config/apiConfig';
import { ProductoService } from './ProductoServices';
import { CategoriaService } from './CategoriaServices';
import type { 
  ProductoStats, 
  CategoriaDistribucion, 
  EstadoInventario, 
  ProductoInventario, 
  ActividadReciente
} from '../interfaces/DashboardStats';
import type { Producto } from '../interfaces/Producto';
import type { Venta } from '../interfaces/Venta';

export const DashboardService = {  // Obtener estadísticas generales de productos
  obtenerEstadisticasProductos: async (): Promise<ProductoStats> => {
    try {
      const productosResponse = await ProductoService.getAllProductos('ROLE_ADMIN');
      const categoriasResponse = await CategoriaService.obtenerTodasCategorias();
      
      // Validar que la respuesta es un array
      const productosData = Array.isArray(productosResponse) ? productosResponse : [];
      const categoriasData = Array.isArray(categoriasResponse) ? categoriasResponse : [];
      
      // Calcular estadísticas
      const total = productosData.length;
      const bajoStock = productosData.filter(p => (p.cantidadTotal || p.cantidad || 0) > 0 && (p.cantidadTotal || p.cantidad || 0) <= 10).length;
      const sinStock = productosData.filter(p => (p.cantidadTotal || p.cantidad || 0) === 0).length;
      const categorias_count = categoriasData.length;
        // Para productos del último mes, necesitaríamos una fecha de creación en el modelo
      // Por ahora, usaremos una aproximación
      const ultimoMes = Math.floor(total * 0.15); // Aproximadamente 15% como nuevos
      
      return {
        total,
        bajoStock,
        sinStock,
        categorias: categorias_count,
        ultimoMes
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de productos:', error);
      // Devolver estadísticas por defecto en caso de error
      return {
        total: 0,
        bajoStock: 0,
        sinStock: 0,
        categorias: 0,
        ultimoMes: 0
      };
    }
  },

  // Obtener distribución por categorías
  obtenerDistribucionCategorias: async (): Promise<CategoriaDistribucion[]> => {
    try {
      const productosResponse = await ProductoService.getAllProductos('ROLE_ADMIN');
      
      // Validar que la respuesta es un array
      const productosData = Array.isArray(productosResponse) ? productosResponse : [];
      
      // Agrupar por categoría
      const categoriasMap = new Map<number, { nombre: string; cantidad: number }>();

      productosData.forEach(producto => {
        const categoriaId = producto.categoria.idCategoria!;
        const categoriaNombre = producto.categoria.nombre;
        
        if (categoriasMap.has(categoriaId)) {
          categoriasMap.get(categoriaId)!.cantidad++;
        } else {
          categoriasMap.set(categoriaId, { nombre: categoriaNombre, cantidad: 1 });
        }
      });
        const total = productosData.length;
      
      return Array.from(categoriasMap.entries()).map(([idCategoria, data]) => ({
        idCategoria,
        nombre: data.nombre,
        cantidadProductos: data.cantidad,
        porcentaje: Math.round((data.cantidad / total) * 100)
      })).sort((a, b) => b.cantidadProductos - a.cantidadProductos);
    } catch (error) {
      console.error('Error obteniendo distribución de categorías:', error);
      return [];
    }
  },

  // Obtener estado del inventario
  obtenerEstadoInventario: async (): Promise<EstadoInventario> => {
    try {
      const productosResponse = await ProductoService.getAllProductos('ROLE_ADMIN');
      
      // Validar que la respuesta es un array
      const productosData = Array.isArray(productosResponse) ? productosResponse : [];      const total = productosData.length;
      const sinStock = productosData.filter(p => (p.cantidadTotal || p.cantidad || 0) === 0).length;
      const critico = productosData.filter(p => {
        const stock = p.cantidadTotal || p.cantidad || 0;
        return stock > 0 && stock <= 5;
      }).length;
      const bajo = productosData.filter(p => {
        const stock = p.cantidadTotal || p.cantidad || 0;
        return stock > 5 && stock <= 15;
      }).length;
      const normal = total - sinStock - critico - bajo;
      
      return {
        normal: total > 0 ? Math.round((normal / total) * 100) : 0,
        bajo: total > 0 ? Math.round((bajo / total) * 100) : 0,
        critico: total > 0 ? Math.round((critico / total) * 100) : 0,
        sinStock: total > 0 ? Math.round((sinStock / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error obteniendo estado del inventario:', error);
      return {
        normal: 0,
        bajo: 0,
        critico: 0,
        sinStock: 0
      };
    }
  },

  // Obtener productos del inventario con estado
  obtenerProductosInventario: async (limite: number = 20, busqueda?: string): Promise<ProductoInventario[]> => {
    try {
      let productosResponse: Producto[];
      
      if (busqueda && busqueda.trim()) {
        productosResponse = await ProductoService.getProductosByNombre(busqueda.trim(), 'ROLE_ADMIN');
      } else {
        productosResponse = await ProductoService.getAllProductos('ROLE_ADMIN');
      }
      
      // Validar que la respuesta es un array
      const productos = Array.isArray(productosResponse) ? productosResponse : [];      
      return productos.slice(0, limite).map(producto => {
        let estado: 'normal' | 'bajo' | 'critico' | 'sin-stock';
        const stock = producto.cantidadTotal || producto.cantidad || 0;
        
        if (stock === 0) {
          estado = 'sin-stock';
        } else if (stock <= 5) {
          estado = 'critico';
        } else if (stock <= 15) {
          estado = 'bajo';
        } else {
          estado = 'normal';
        }
        
        return {
          idProducto: producto.idProducto!,
          nombre: producto.nombre,
          codigoIdentificacion: producto.codigoIdentificacion,
          categoria: producto.categoria.nombre,
          stock: stock,
          estado,
          precioUnitario: producto.precioUnitario,
          marca: producto.marca,
          proveedor: producto.proveedor.nombre,
          fechaActualizacion: new Date().toLocaleDateString() // Mock date, idealmente del backend
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
      // Esta función combina datos de diferentes fuentes para simular actividad
      const actividades: ActividadReciente[] = [];
      
      // Obtener productos con stock crítico (disponible para todos los roles)
      const productosResponse = await ProductoService.getAllProductos('ROLE_ADMIN');
      const productos = Array.isArray(productosResponse) ? productosResponse : [];
      const productosCriticos = productos.filter(p => (p.cantidadTotal || p.cantidad || 0) <= 5);
      
      productosCriticos.slice(0, 2).forEach((producto, index) => {
        const stock = producto.cantidadTotal || producto.cantidad || 0;
        actividades.push({
          id: `stock-critico-${producto.idProducto}`,
          tipo: 'stock_critico',
          descripcion: 'Stock crítico detectado',
          detalles: `${producto.nombre} - Solo ${stock} unidades`,
          fecha: new Date(Date.now() - (index * 30 * 60 * 1000)).toISOString(), // Hace 30 min, 1 hora
        });
      });
        // Solo obtener ventas si el usuario tiene permisos (cajero o admin)
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
      
      // If no real activities found, you could add a message or leave empty
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
