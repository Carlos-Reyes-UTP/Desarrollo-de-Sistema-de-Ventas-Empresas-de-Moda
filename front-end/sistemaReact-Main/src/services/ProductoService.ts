import apiClient from '../config/apiClient';
import type { Producto } from '../types/Producto';
import { RUTAS_PRODUCTOS } from '../config/apiConfig';
import { throwAuthError } from '../utils/handleApiError';
import { logger } from '../utils/logger';
import axios from 'axios';

const getEndpointForRole = (userRole: string | null, operationType: 'read' | 'write' = 'read') => {

  if (operationType === 'write') {
    return RUTAS_PRODUCTOS; 
  }
  
  // Lectura: cajero en POS. Vendedor unificado usa rutas de almacenero (permiso en API).
  if (userRole === 'ROLE_CAJERO') {
    return RUTAS_PRODUCTOS.CAJERO;
  }

  return RUTAS_PRODUCTOS;
};

// Caché global para evitar colapsos al pedir el catálogo completo múltiples veces a la vez
let cachedCatalogoPromise: Promise<Producto[]> | null = null;
let lastCatalogoCacheTime = 0;
const CATALOGO_CACHE_DURATION = 30000; // 30 segundos

export const ProductoService = {
 
  getAllProductos: async (userRole?: string): Promise<Producto[]> => {
    const now = Date.now();
    
    // Si hay una petición en curso o en caché fresco, devolver esa misma promesa
    if (cachedCatalogoPromise && now - lastCatalogoCacheTime < CATALOGO_CACHE_DURATION) {
      logger.debug('[CACHE] Devolviendo catalogo desde cache para evitar sobrecarga.');
      return cachedCatalogoPromise;
    }

    const endpoints = getEndpointForRole(userRole || null, 'read');
    
    logger.debug('[RED] Solicitando catalogo completo al servidor...');
    cachedCatalogoPromise = apiClient.get<Producto[]>(endpoints.BASE).then(response => {
      return response.data;
    }).catch(error => {
      cachedCatalogoPromise = null; // Limpiar si falla
      throw error;
    });
    
    lastCatalogoCacheTime = now;
    return cachedCatalogoPromise;
  },

  // NUEVO: Obtener productos con paginación desde el servidor (Optimizado para 10k+ productos)
  getProductosPaginados: async (
    page: number = 0,
    size: number = 20,
    busqueda?: string,
    userRole?: string,
    sector?: string
  ): Promise<{
    content: Producto[],
    totalElements: number,
    totalPages: number,
    pageNumber: number,
    pageSize: number
  }> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    // Si el rol es cajero, no hay PAGINADOS en CAJERO; se usa el listado paginado de almacenero.
    const url =
      'PAGINADOS' in endpoints && endpoints.PAGINADOS
        ? endpoints.PAGINADOS
        : RUTAS_PRODUCTOS.PAGINADOS;
    
    const params: Record<string, string | number> = { page, size };
    if (busqueda && busqueda.trim()) {
      params.busqueda = busqueda.trim();
    }
    if (sector?.trim()) {
      params.sector = sector.trim();
    }

    const response = await apiClient.get(url, { params });
    return response.data;
  },

  getProductoById: async (id: number, userRole?: string): Promise<Producto> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await apiClient.get<Producto>(endpoints.POR_ID(id));
    return response.data;
  },

  getProductosByCodigo: async (codigo: string, userRole?: string): Promise<Producto[]> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await apiClient.get<Producto[]>(endpoints.POR_CODIGO(codigo));
    return response.data;
  },

  getProductosByNombre: async (nombre: string, userRole?: string): Promise<Producto[]> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await apiClient.get<Producto[]>(endpoints.POR_NOMBRE(nombre));
    return response.data;
  },
  // Special search method for cajero
  buscarProductos: async (termino: string, userRole?: string): Promise<Producto[]> => {
    if (userRole === 'ROLE_CAJERO') {
      const response = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.CAJERO.BUSCAR(termino));
      return response.data;
    }
    // For other roles, fall back to search by name
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await apiClient.get<Producto[]>(endpoints.POR_NOMBRE(termino));
    return response.data;
  },
  // Comprehensive search for inventario (admin, almacenero, vendedor)
  buscarProductosCompleto: async (termino: string, userRole?: string): Promise<Producto[]> => {
    const puedeBusquedaAmplia =
      userRole === 'ROLE_ADMIN' ||
      userRole === 'ROLE_ALMACENERO' ||
      userRole === 'ROLE_VENDEDOR';
    if (!puedeBusquedaAmplia) {
      // Otros roles usan búsqueda simple
      return ProductoService.buscarProductos(termino, userRole);
    }

    const productosUnicos = new Map<number, Producto>();

    try {
      // Search in almacenero endpoints (full access)
      const productosAlmacenero = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_NOMBRE(termino));
      productosAlmacenero.data.forEach(p => {
        if (p.idProducto) productosUnicos.set(p.idProducto, p);
      });
    } catch (err) {
      logger.error('Error searching almacenero endpoints:', err);
    }

    try {
      // Also try cajero endpoints for completeness
      const productosCajero = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.CAJERO.BUSCAR(termino));
      productosCajero.data.forEach(p => {
        if (p.idProducto && !productosUnicos.has(p.idProducto)) {
          productosUnicos.set(p.idProducto, p);
        }
      });
    } catch (err) {
      logger.error('Error searching cajero endpoints:', err);
    }    return Array.from(productosUnicos.values());
  },

  // Write operations - only for almacenero/admin
  createProducto: async (productoData: Omit<Producto, 'idProducto'>): Promise<Producto> => {
    try {
      const response = await apiClient.post<Producto>(RUTAS_PRODUCTOS.BASE, productoData);
      return response.data;
    } catch (error: any) {
      throwAuthError(error, 'crear productos');
    }
  },
  updateProducto: async (id: number, productoData: Producto): Promise<Producto> => {
    try {
      const response = await apiClient.put<Producto>(RUTAS_PRODUCTOS.POR_ID(id), productoData);
      return response.data;
    } catch (error: any) {
      throwAuthError(error, 'actualizar productos');
    }
  },
  deleteProducto: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(RUTAS_PRODUCTOS.POR_ID(id));
    } catch (error: any) {
      throwAuthError(error, 'eliminar productos');
    }
  },

  // Legacy methods (maintain backward compatibility)
  getProductosByCategoria: async (nombreCategoria: string): Promise<Producto[]> => {
    const response = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_CATEGORIA(nombreCategoria));
    return response.data;
  },

  // Nuevos métodos para filtrar por categoría principal y subcategoría
  getProductosByCategoriaPrincipal: async (categoriaPrincipal: string): Promise<Producto[]> => {
    const response = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_CATEGORIA_PRINCIPAL(categoriaPrincipal));
    return response.data;
  },

  getProductosBySubCategoria: async (subCategoria: string): Promise<Producto[]> => {
    const response = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_SUBCATEGORIA(subCategoria));
    return response.data;
  },

  getProductosByFiltrosCategorias: async (
    categoriaPrincipal?: string,
    subCategoria?: string
  ): Promise<Producto[]> => {
    const response = await apiClient.get<Producto[]>(
      RUTAS_PRODUCTOS.FILTRAR_CATEGORIAS(categoriaPrincipal, subCategoria)
    );
    return response.data;
  },

  getProductosByProveedor: async (nombreProveedor: string): Promise<Producto[]> => {
    const response = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_PROVEEDOR(nombreProveedor));
    return response.data;
  },

  // Método para disminuir la cantidad del producto general
  disminuirCantidadProducto: async (id: number, cantidad: number): Promise<Producto> => {
    try {
      const response = await apiClient.patch<Producto>(
        RUTAS_PRODUCTOS.CAJERO.DISMINUIR_PRODUCTO(id),
        null,
        {
          params: { cantidad }
        }
      );
      return response.data;
    } catch (error: any) {
      if ((axios.isAxiosError(error) && error.response?.status) === 400) {
        throw new Error('Stock insuficiente del producto general');
      } else if ((axios.isAxiosError(error) && error.response?.status) === 404) {
        throw new Error('Producto no encontrado');
      }
      throwAuthError(error, 'actualizar el stock');
    }
  },
};
