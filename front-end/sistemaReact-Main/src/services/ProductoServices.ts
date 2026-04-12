import apiClient from '../config/apiClient';
import type { Producto } from '../interfaces/Producto';
import { RUTAS_PRODUCTOS } from '../config/apiConfig';

const getEndpointForRole = (userRole: string | null, operationType: 'read' | 'write' = 'read') => {

  if (operationType === 'write') {
    return RUTAS_PRODUCTOS; 
  }
  
  // For read operations, route based on role
  if (userRole === 'ROLE_CAJERO') {
    return RUTAS_PRODUCTOS.CAJERO; 
  }
  

  return RUTAS_PRODUCTOS;
};

export const ProductoService = {
 
  getAllProductos: async (userRole?: string): Promise<Producto[]> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await apiClient.get<Producto[]>(endpoints.BASE);
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
  // Comprehensive search for admins - searches across all available endpoints
  buscarProductosCompleto: async (termino: string, userRole?: string): Promise<Producto[]> => {
    if (userRole !== 'ROLE_ADMIN') {
      // Non-admins use regular search
      return ProductoService.buscarProductos(termino, userRole);
    }

    // Admins get comprehensive search across all endpoints
    const productosUnicos = new Map<number, Producto>();

    try {
      // Search in almacenero endpoints (full access)
      const productosAlmacenero = await apiClient.get<Producto[]>(RUTAS_PRODUCTOS.POR_NOMBRE(termino));
      productosAlmacenero.data.forEach(p => {
        if (p.idProducto) productosUnicos.set(p.idProducto, p);
      });
    } catch (err) {
      console.log('Error searching almacenero endpoints:', err);
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
      console.log('Error searching cajero endpoints:', err);
    }    return Array.from(productosUnicos.values());
  },

  // Write operations - only for almacenero/admin
  createProducto: async (productoData: Omit<Producto, 'idProducto'>): Promise<Producto> => {
    try {
      const response = await apiClient.post<Producto>(RUTAS_PRODUCTOS.BASE, productoData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para crear productos. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para crear productos. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
    }
  },
  updateProducto: async (id: number, productoData: Producto): Promise<Producto> => {
    try {
      const response = await apiClient.put<Producto>(RUTAS_PRODUCTOS.POR_ID(id), productoData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para actualizar productos. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para actualizar productos. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
    }
  },
  deleteProducto: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(RUTAS_PRODUCTOS.POR_ID(id));
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para eliminar productos. Inicia sesión como Almacenero o Administrador.');
      } else if (error.response?.status === 403) {
        throw new Error('Error de permisos: No tienes autorización para eliminar productos. Esta acción requiere rol de Almacenero o Administrador.');
      }
      throw error;
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
      if (error.response?.status === 400) {
        throw new Error('Stock insuficiente del producto general');
      } else if (error.response?.status === 404) {
        throw new Error('Producto no encontrado');
      } else if (error.response?.status === 401) {
        throw new Error('Error de autorización: Tu sesión ha expirado o no tienes permisos para actualizar el stock.');
      }
      throw error;
    }
  },
};
