import axios from 'axios';
import { RUTAS_PRODUCTOS, RUTAS_CATEGORIAS, RUTAS_VENTAS } from '../config/apiConfig';
import type { 
  ProductoStats, 
  CategoriaDistribucion, 
  EstadoInventario, 
  ProductoInventario, 
  ActividadReciente
} from '../interfaces/DashboardStats';
import type { Producto } from '../interfaces/Producto';
import type { Categoria } from '../interfaces/Categoria';
import type { Venta } from '../interfaces/Venta';

export const DashboardService = {
  // Obtener estadísticas generales de productos
  obtenerEstadisticasProductos: async (): Promise<ProductoStats> => {
    try {
      const productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.BASE);
      const categorias = await axios.get<Categoria[]>(RUTAS_CATEGORIAS.BASE);
      
      const productosData = productos.data;
      const categoriasData = categorias.data;
      
      // Calcular estadísticas
      const total = productosData.length;
      const bajoStock = productosData.filter(p => p.cantidad > 0 && p.cantidad <= 10).length;
      const sinStock = productosData.filter(p => p.cantidad === 0).length;
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
      throw error;
    }
  },

  // Obtener distribución por categorías
  obtenerDistribucionCategorias: async (): Promise<CategoriaDistribucion[]> => {
    try {
      const productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.BASE);
      const productosData = productos.data;
      
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
      throw error;
    }
  },

  // Obtener estado del inventario
  obtenerEstadoInventario: async (): Promise<EstadoInventario> => {
    try {
      const productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.BASE);
      const productosData = productos.data;
      
      const total = productosData.length;
      const sinStock = productosData.filter(p => p.cantidad === 0).length;
      const critico = productosData.filter(p => p.cantidad > 0 && p.cantidad <= 5).length;
      const bajo = productosData.filter(p => p.cantidad > 5 && p.cantidad <= 15).length;
      const normal = total - sinStock - critico - bajo;
      
      return {
        normal: Math.round((normal / total) * 100),
        bajo: Math.round((bajo / total) * 100),
        critico: Math.round((critico / total) * 100),
        sinStock: Math.round((sinStock / total) * 100)
      };
    } catch (error) {
      console.error('Error obteniendo estado del inventario:', error);
      throw error;
    }
  },

  // Obtener productos del inventario con estado
  obtenerProductosInventario: async (limite: number = 20, busqueda?: string): Promise<ProductoInventario[]> => {
    try {
      let productos: Producto[];
      
      if (busqueda && busqueda.trim()) {
        productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.POR_NOMBRE(busqueda.trim()))
          .then(response => response.data);
      } else {
        productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.BASE)
          .then(response => response.data);
      }
      
      return productos.slice(0, limite).map(producto => {
        let estado: 'normal' | 'bajo' | 'critico' | 'sin-stock';
        
        if (producto.cantidad === 0) {
          estado = 'sin-stock';
        } else if (producto.cantidad <= 5) {
          estado = 'critico';
        } else if (producto.cantidad <= 15) {
          estado = 'bajo';
        } else {
          estado = 'normal';
        }
        
        return {
          idProducto: producto.idProducto!,
          nombre: producto.nombre,
          codigoIdentificacion: producto.codigoIdentificacion,
          categoria: producto.categoria.nombre,
          stock: producto.cantidad,
          estado,
          precioUnitario: producto.precioUnitario,
          marca: producto.marca,
          proveedor: producto.proveedor.nombre,
          fechaActualizacion: new Date().toLocaleDateString() // Mock date, idealmente del backend
        };
      });
    } catch (error) {
      console.error('Error obteniendo productos del inventario:', error);
      throw error;
    }
  },
  // Obtener actividad reciente
  obtenerActividadReciente: async (userRole?: string): Promise<ActividadReciente[]> => {
    try {
      // Esta función combina datos de diferentes fuentes para simular actividad
      const actividades: ActividadReciente[] = [];
      
      // Obtener productos con stock crítico (disponible para todos los roles)
      const productos = await axios.get<Producto[]>(RUTAS_PRODUCTOS.BASE);
      const productosCriticos = productos.data.filter(p => p.cantidad <= 5);
      
      productosCriticos.slice(0, 2).forEach((producto, index) => {
        actividades.push({
          id: `stock-critico-${producto.idProducto}`,
          tipo: 'stock_critico',
          descripcion: 'Stock crítico detectado',
          detalles: `${producto.nombre} - Solo ${producto.cantidad} unidades`,
          fecha: new Date(Date.now() - (index * 30 * 60 * 1000)).toISOString(), // Hace 30 min, 1 hora
        });
      });
      
      // Solo obtener ventas si el usuario tiene permisos (cajero o admin)
      if (userRole === 'ROLE_CAJERO' || userRole === 'ROLE_ADMIN') {
        try {
          const ventasHoy = await axios.get<Venta[]>(RUTAS_VENTAS.POR_FECHA(new Date().toISOString().split('T')[0]));
          if (ventasHoy.data.length > 0) {
            const ventaReciente = ventasHoy.data[0];
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
        }      }
      
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
  },
  // Actualizar stock de un producto
  actualizarStockProducto: async (idProducto: number, nuevaCantidad: number): Promise<Producto> => {
    try {
      // Primero obtener el producto actual
      const productoActual = await axios.get<Producto>(RUTAS_PRODUCTOS.POR_ID(idProducto));
      
      // Actualizar la cantidad
      const productoActualizado = {
        ...productoActual.data,
        cantidad: nuevaCantidad
      };
      
      // Enviar la actualización
      const response = await axios.put<Producto>(RUTAS_PRODUCTOS.POR_ID(idProducto), productoActualizado);
      
      return response.data;
    } catch (error) {
      console.error('Error actualizando stock del producto:', error);
      throw error;
    }
  }
};
