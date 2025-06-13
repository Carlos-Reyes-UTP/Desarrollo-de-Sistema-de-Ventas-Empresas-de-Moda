import apiClient from '../config/apiClient';
import { AxiosError } from 'axios';
import type { ProductoVariante } from '../interfaces/ProductoVariante';
import type { Color } from '../interfaces/Color';
import type { Talla } from '../interfaces/Talla';
import { RUTAS_VARIANTES } from '../config/apiConfig';

export const ProductoVarianteService = {
  // Crear nueva variante
  crearVariante: async (variante: Omit<ProductoVariante, 'idVariante'>): Promise<ProductoVariante> => {
    const response = await apiClient.post<ProductoVariante>(RUTAS_VARIANTES.BASE, variante);
    return response.data;
  },

  // Actualizar variante completa
  actualizarVariante: async (id: number, variante: ProductoVariante): Promise<ProductoVariante> => {
    const response = await apiClient.put<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id), variante);
    return response.data;
  },

  // Obtener variante por ID
  obtenerVariantePorId: async (id: number): Promise<ProductoVariante | null> => {
    try {
      const response = await apiClient.get<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Obtener todas las variantes de un producto
  obtenerVariantesPorProducto: async (idProducto: number): Promise<ProductoVariante[]> => {
    const response = await apiClient.get<ProductoVariante[]>(RUTAS_VARIANTES.POR_PRODUCTO(idProducto));
    return response.data;
  },

  // Obtener variantes por producto y talla
  obtenerVariantesPorProductoYTalla: async (idProducto: number, idTalla: number): Promise<ProductoVariante[]> => {
    const response = await apiClient.get<ProductoVariante[]>(
      RUTAS_VARIANTES.POR_PRODUCTO_Y_TALLA(idProducto, idTalla)
    );
    return response.data;
  },

  // Obtener variantes por producto y color
  obtenerVariantesPorProductoYColor: async (idProducto: number, idColor: number): Promise<ProductoVariante[]> => {
    const response = await apiClient.get<ProductoVariante[]>(
      RUTAS_VARIANTES.POR_PRODUCTO_Y_COLOR(idProducto, idColor)
    );
    return response.data;
  },

  // Obtener variante específica por producto, talla y color
  obtenerVariantePorProductoTallaColor: async (
    idProducto: number, 
    idTalla: number, 
    idColor: number
  ): Promise<ProductoVariante | null> => {
    try {
      const response = await apiClient.get<ProductoVariante>(
        RUTAS_VARIANTES.POR_PRODUCTO_TALLA_COLOR(idProducto, idTalla, idColor)
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Actualizar solo la cantidad de una variante
  actualizarCantidad: async (id: number, cantidad: number): Promise<ProductoVariante> => {
    if (cantidad < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    const response = await apiClient.patch<ProductoVariante>(
      RUTAS_VARIANTES.ACTUALIZAR_CANTIDAD(id),
      null,
      { params: { cantidad } }
    );
    return response.data;
  },

  // Eliminar variante
  eliminarVariante: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_VARIANTES.POR_ID(id));
  },

  // Obtener cantidad total de un producto (suma de todas sus variantes)
  obtenerCantidadTotalProducto: async (idProducto: number): Promise<number> => {
    const response = await apiClient.get<number>(RUTAS_VARIANTES.CANTIDAD_TOTAL_PRODUCTO(idProducto));
    return response.data;
  },

  // Migrar producto existente a sistema de variantes
  migrarProductoAVariantes: async (
    idProducto: number,
    tallas: Talla[],
    colores: Color[],
    distribucionPorcentual: boolean = false
  ): Promise<ProductoVariante[]> => {
    const payload = {
      tallas,
      colores
    };
    const response = await apiClient.post<ProductoVariante[]>(
      RUTAS_VARIANTES.MIGRAR_PRODUCTO(idProducto),
      payload,
      { params: { distribucionPorcentual } }
    );
    return response.data;
  },
};
