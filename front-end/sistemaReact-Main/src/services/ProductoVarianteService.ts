import apiClient from '../config/apiClient';
import { AxiosError } from 'axios';
import type { ProductoVariante } from '../types/ProductoVariante';
import type { Talla } from '../types/Talla';
import type { Color } from '../types/Color';
import { RUTAS_VARIANTES, RUTAS_PRODUCTOS } from '../config/apiConfig';
import { throwAuthError } from '../utils/handleApiError';
import { logger } from '../utils/logger';

/**
 * Adaptador desde el backend.
 *
 * La entidad JPA `ProductoVariante` expone `talla` y `color` como `String`,
 * mientras el endpoint del cajero (`CajeroProductoController#mapearResultadoAVariante`)
 * los envuelve como objetos. Este normalizador unifica ambos formatos al shape
 * que consume el front (`Talla` / `Color`) y sincroniza los IDs y el campo del
 * código de barras (entidad: `codigoBarras`; cajero: `codigoBarrasVariante`).
 */
function normalizarVarianteDesdeBackend(raw: any): ProductoVariante {
  if (!raw || typeof raw !== 'object') return raw;

  let talla: Talla;
  if (typeof raw.talla === 'string') {
    talla = { nombreTalla: raw.talla };
  } else if (raw.talla && typeof raw.talla === 'object') {
    talla = { nombreTalla: '', ...raw.talla } as Talla;
  } else {
    talla = { nombreTalla: '' };
  }

  let color: Color;
  if (typeof raw.color === 'string') {
    color = { nombre: raw.color };
  } else if (raw.color && typeof raw.color === 'object') {
    color = { nombre: '', ...raw.color } as Color;
  } else {
    color = { nombre: '' };
  }

  const codigoBarrasVariante = raw.codigoBarrasVariante ?? raw.codigoBarras;
  const idProductoVariante = raw.idProductoVariante ?? raw.idVariante;
  const idVariante = raw.idVariante ?? raw.idProductoVariante;

  return {
    ...raw,
    idProductoVariante,
    idVariante,
    talla,
    color,
    codigoBarrasVariante,
  } as ProductoVariante;
}

/**
 * Adapta el shape del front al contrato real de la entidad antes de enviarlo:
 * aplana `talla`/`color` a `String`, reescribe `codigoBarrasVariante` →
 * `codigoBarras` y reduce `producto` al mínimo que el back resuelve por id.
 */
function prepararPayloadParaBackend(variante: Partial<ProductoVariante>): Record<string, unknown> {
  const tallaRaw = variante.talla as unknown;
  const nombreTalla = typeof tallaRaw === 'string'
    ? tallaRaw
    : (tallaRaw as Talla | undefined)?.nombreTalla ?? '';

  const colorRaw = variante.color as unknown;
  const nombreColor = typeof colorRaw === 'string'
    ? colorRaw
    : (colorRaw as Color | undefined)?.nombre ?? '';

  const codigoBarras = variante.codigoBarrasVariante ?? (variante as Record<string, unknown>).codigoBarras;

  const productoMinimo = variante.producto?.idProducto != null
    ? { idProducto: variante.producto.idProducto }
    : variante.producto;

  const payload: Record<string, unknown> = {
    ...variante,
    talla: nombreTalla,
    color: nombreColor,
    codigoBarras,
    producto: productoMinimo,
  };

  delete payload.codigoBarrasVariante;
  delete payload.idVariante;

  return payload;
}

export const ProductoVarianteService = {    // Crear nueva variante
  crearVariante: async (
    variante: Omit<ProductoVariante, 'idVariante'>,
    idUbicacionArea?: number | null
  ): Promise<ProductoVariante> => {
    try {
      const payload = prepararPayloadParaBackend(variante);
      logger.debug('Creando nueva variante con datos:', payload);
      const params =
        idUbicacionArea != null && idUbicacionArea > 0
          ? { idUbicacionArea }
          : undefined;
      const response = await apiClient.post<ProductoVariante>(RUTAS_VARIANTES.BASE, payload, {
        params,
      });
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error: any) {
      logger.error('Error al crear variante:', error);
      throwAuthError(error, 'crear variantes');
    }
  },  // Actualizar variante completa
  actualizarVariante: async (id: number, variante: ProductoVariante): Promise<ProductoVariante> => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new Error('ID de variante inválido o indefinido');
      }
      
      const payload = {
        ...prepararPayloadParaBackend(variante),
        idProductoVariante: id,
      };
      logger.debug(`Actualizando variante ID: ${id} con datos:`, payload);
      const response = await apiClient.put<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id), payload);
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`No se encontro la variante con ID: ${id}. Es posible que haya sido eliminada.`);
      }
      throwAuthError(error, 'actualizar variantes');
    }
  },
  // Obtener variante por ID
  obtenerVariantePorId: async (id: number): Promise<ProductoVariante | null> => {
    try {
      logger.debug(`Obteniendo variante con ID: ${id}`);
      const response = await apiClient.get<ProductoVariante>(RUTAS_VARIANTES.POR_ID(id));
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        logger.debug(`No se encontro la variante con ID: ${id}`);
        return null;
      }
      logger.error(`Error al obtener variante ${id}:`, error);
      throw error;
    }
  },  // Obtener todas las variantes de un producto
  obtenerVariantesPorProducto: async (
    idProducto: number,
    idUbicacionArea?: number | null
  ): Promise<ProductoVariante[]> => {
    try {
      logger.debug(`Obteniendo variantes para producto ID: ${idProducto}`);
      const params =
        idUbicacionArea != null && idUbicacionArea > 0
          ? { idUbicacionArea }
          : undefined;
      const response = await apiClient.get<ProductoVariante[]>(
        RUTAS_VARIANTES.POR_PRODUCTO(idProducto),
        { params }
      );
      
      if (response.data.length > 0) {
        const primerVariante = response.data[0];
        logger.debug(`Estructura de la primera variante para producto ${idProducto}:`, {
          idVariante: primerVariante.idVariante,
          idProductoVariante: primerVariante.idProductoVariante,
          tieneProducto: !!primerVariante.producto,
          tieneTalla: !!primerVariante.talla,
          tieneColor: !!primerVariante.color,
          propiedadesCompletas: Object.keys(primerVariante)
        });
      }
      
      const variantesMapeadas = response.data.map(normalizarVarianteDesdeBackend);

      const variantesUnicas = Array.from(
        new Map(variantesMapeadas.map(v => [v.idProductoVariante ?? v.idVariante, v])).values()
      );
      
      logger.debug(`Variantes obtenidas: ${variantesUnicas.length}`);
      return variantesUnicas;
    } catch (error: any) {
      logger.error(`Error al obtener variantes para producto ${idProducto}:`, error);
      
      if (error.response?.status === 404) {
        logger.debug(`No se encontraron variantes para el producto ${idProducto}`);
        return [];
      }
      throwAuthError(error, 'ver las variantes');
    }
  },

  // Obtener variantes por producto y talla (nombre de talla como texto en BD)
  obtenerVariantesPorProductoYTalla: async (idProducto: number, nombreTalla: string): Promise<ProductoVariante[]> => {
    try {
      const response = await apiClient.get<ProductoVariante[]>(
        RUTAS_VARIANTES.POR_PRODUCTO_Y_TALLA(idProducto, nombreTalla)
      );
      return response.data.map(normalizarVarianteDesdeBackend);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) return [];
      throw error;
    }
  },

  // Obtener variantes por producto y color (nombre de color como texto en BD)
  obtenerVariantesPorProductoYColor: async (idProducto: number, nombreColor: string): Promise<ProductoVariante[]> => {
    try {
      const response = await apiClient.get<ProductoVariante[]>(
        RUTAS_VARIANTES.POR_PRODUCTO_Y_COLOR(idProducto, nombreColor)
      );
      return response.data.map(normalizarVarianteDesdeBackend);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) return [];
      throw error;
    }
  },

  // Obtener variante específica por producto, talla y color (texto)
  obtenerVariantePorProductoTallaColor: async (
    idProducto: number,
    nombreTalla: string,
    nombreColor: string
  ): Promise<ProductoVariante | null> => {
    try {
      const response = await apiClient.get<ProductoVariante>(
        RUTAS_VARIANTES.POR_PRODUCTO_TALLA_COLOR(idProducto, nombreTalla, nombreColor)
      );
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  // Actualizar solo la cantidad de una variante
  actualizarCantidad: async (
    id: number,
    cantidad: number,
    idUbicacionArea?: number | null
  ): Promise<ProductoVariante> => {
    if (cantidad < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
    
    try {
      const params: Record<string, number> = { cantidad };
      if (idUbicacionArea != null && idUbicacionArea > 0) {
        params.idUbicacionArea = idUbicacionArea;
      }
      const response = await apiClient.patch<ProductoVariante>(
        RUTAS_VARIANTES.ACTUALIZAR_CANTIDAD(id),
        null,
        { params }
      );
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error: any) {
      throwAuthError(error, 'actualizar la cantidad');
    }
  },
  // Eliminar variante
  eliminarVariante: async (id: number): Promise<void> => {
    try {
      logger.debug(`Eliminando variante con ID: ${id}`);
      await apiClient.delete(RUTAS_VARIANTES.POR_ID(id));
      logger.debug(`Variante eliminada correctamente`);
    } catch (error: any) {
      logger.error(`Error al eliminar variante ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error(`No se encontro la variante con ID: ${id}. Es posible que ya haya sido eliminada.`);
      }
      throwAuthError(error, 'eliminar variantes');
    }
  },

  // Obtener cantidad total de un producto (suma de todas sus variantes)
  obtenerCantidadTotalProducto: async (idProducto: number): Promise<number> => {
    const response = await apiClient.get<number>(RUTAS_VARIANTES.CANTIDAD_TOTAL_PRODUCTO(idProducto));
    return response.data;
  },

  // Migrar producto existente a sistema de variantes (backend: listas de nombres como string)
  migrarProductoAVariantes: async (
    idProducto: number,
    tallas: string[],
    colores: string[],
    distribucionPorcentual: boolean = false,
    idUbicacionArea?: number | null
  ): Promise<ProductoVariante[]> => {
    try {
      const payload = { tallas, colores };
      const params: Record<string, string | number | boolean> = { distribucionPorcentual };
      if (idUbicacionArea != null && idUbicacionArea > 0) {
        params.idUbicacionArea = idUbicacionArea;
      }
      const response = await apiClient.post<ProductoVariante[]>(
        RUTAS_VARIANTES.MIGRAR_PRODUCTO(idProducto),
        payload,
        { params }
      );
      return response.data.map(normalizarVarianteDesdeBackend);
    } catch (error: any) {
      throwAuthError(error, 'migrar el producto');
    }
  },

  // Obtener todas las variantes (optimizado por rol y contexto)
  obtenerTodasLasVariantes: async (userRole?: string, forSales?: boolean): Promise<ProductoVariante[]> => {
    const normalizedRole = userRole?.toUpperCase();
    
    let endpoint: string;
    let isAlmaceneroEndpoint = false;
    
    if (forSales || normalizedRole === 'ROLE_CAJERO' || normalizedRole === 'CAJERO') {
      endpoint = RUTAS_PRODUCTOS.CAJERO.VARIANTES;
    } else {
      endpoint = RUTAS_VARIANTES.TODAS;
      isAlmaceneroEndpoint = true;
    }
    
    try {
      const response = await apiClient.get<ProductoVariante[]>(endpoint);
      logger.debug(`Se obtuvieron ${response.data.length} variantes desde ${isAlmaceneroEndpoint ? 'almacenero' : 'cajero'}`);

      const variantes = response.data.map(normalizarVarianteDesdeBackend);
      
      if (variantes.length > 0) {
        logger.debug('Primera variante obtenida:', {
          producto: variantes[0].producto ? variantes[0].producto.nombre : 'NO HAY PRODUCTO',
          endpoint_usado: isAlmaceneroEndpoint ? 'almacenero' : 'cajero'
        });
      }
      
      return variantes;
    } catch (primaryError: any) {
      const status = primaryError.response?.status;
      if ((status === 403 || status === 404) && isAlmaceneroEndpoint) {
        logger.debug(`Error ${status} con endpoint de almacenero, intentando con cajero como fallback`);
        
        const fallbackResponse = await apiClient.get<ProductoVariante[]>(RUTAS_PRODUCTOS.CAJERO.VARIANTES);
        const variantes = fallbackResponse.data.map(normalizarVarianteDesdeBackend);
        
        logger.debug(`Se obtuvieron ${variantes.length} variantes desde endpoint del cajero (fallback)`);
        logger.warn('Los precios de volumen pueden no estar disponibles con el endpoint del cajero');
        
        return variantes;
      }
      
      throw primaryError;
    }
  },

  // Disminuir cantidad de variante (para ventas del cajero)
  disminuirCantidadVariante: async (id: number, cantidad: number): Promise<ProductoVariante> => {
    try {
      logger.debug(`Disminuyendo ${cantidad} unidades de la variante ID: ${id}`);
      
      const response = await apiClient.patch<ProductoVariante>(
        RUTAS_PRODUCTOS.CAJERO.DISMINUIR_VARIANTE(id),
        null,
        { params: { cantidad } }
      );

      logger.debug(`Stock de variante ${id} reducido exitosamente en ${cantidad} unidades`);
      return normalizarVarianteDesdeBackend(response.data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Stock insuficiente para realizar la venta');
      } else if (error.response?.status === 404) {
        throw new Error(`No se encontro la variante con ID: ${id}`);
      }
      logger.error(`Error al disminuir cantidad de variante ${id}:`, error);
      throw error;
    }
  },

  // NUEVO: Obtener variantes paginadas con búsqueda server-side (para el cajero)
  obtenerVariantesPaginadas: async (
    page: number = 0, 
    size: number = 30, 
    busqueda?: string
  ): Promise<{
    content: ProductoVariante[];
    totalElements: number;
    totalPages: number;
    pageNumber: number;
    pageSize: number;
  }> => {
    try {
      const params: Record<string, string | number> = { page, size };
      if (busqueda && busqueda.trim()) {
        params.busqueda = busqueda.trim();
      }
      
      const response = await apiClient.get(RUTAS_PRODUCTOS.CAJERO.VARIANTES_PAGINADAS, { params });

      const content = (response.data.content || []).map(normalizarVarianteDesdeBackend);
      
      return {
        content,
        totalElements: response.data.totalElements,
        totalPages: response.data.totalPages,
        pageNumber: response.data.pageNumber,
        pageSize: response.data.pageSize,
      };
    } catch (error) {
      logger.error('Error al obtener variantes paginadas:', error);
      throw error;
    }
  },
};
