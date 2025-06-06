import axios from 'axios';
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
    const response = await axios.get<Producto[]>(endpoints.BASE);
    return response.data;
  },

  getProductoById: async (id: number, userRole?: string): Promise<Producto> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await axios.get<Producto>(endpoints.POR_ID(id));
    return response.data;
  },

  getProductosByCodigo: async (codigo: string, userRole?: string): Promise<Producto[]> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await axios.get<Producto[]>(endpoints.POR_CODIGO(codigo));
    return response.data;
  },

  getProductosByNombre: async (nombre: string, userRole?: string): Promise<Producto[]> => {
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await axios.get<Producto[]>(endpoints.POR_NOMBRE(nombre));
    return response.data;
  },
  // Special search method for cajero
  buscarProductos: async (termino: string, userRole?: string): Promise<Producto[]> => {
    if (userRole === 'ROLE_CAJERO') {
      const response = await axios.get<Producto[]>(RUTAS_PRODUCTOS.CAJERO.BUSCAR(termino));
      return response.data;
    }
    // For other roles, fall back to search by name
    const endpoints = getEndpointForRole(userRole || null, 'read');
    const response = await axios.get<Producto[]>(endpoints.POR_NOMBRE(termino));
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
      const productosAlmacenero = await axios.get<Producto[]>(RUTAS_PRODUCTOS.POR_NOMBRE(termino));
      productosAlmacenero.data.forEach(p => {
        if (p.idProducto) productosUnicos.set(p.idProducto, p);
      });
    } catch (err) {
      console.log('Error searching almacenero endpoints:', err);
    }

    try {
      // Also try cajero endpoints for completeness
      const productosCajero = await axios.get<Producto[]>(RUTAS_PRODUCTOS.CAJERO.BUSCAR(termino));
      productosCajero.data.forEach(p => {
        if (p.idProducto && !productosUnicos.has(p.idProducto)) {
          productosUnicos.set(p.idProducto, p);
        }
      });
    } catch (err) {
      console.log('Error searching cajero endpoints:', err);
    }

    return Array.from(productosUnicos.values());
  },

  // Write operations - only for almacenero/admin
  createProducto: async (productoData: Omit<Producto, 'idProducto'>): Promise<Producto> => {
    const response = await axios.post<Producto>(RUTAS_PRODUCTOS.BASE, productoData);
    return response.data;
  },

  updateProducto: async (id: number, productoData: Producto): Promise<Producto> => {
    const response = await axios.put<Producto>(RUTAS_PRODUCTOS.POR_ID(id), productoData);
    return response.data;
  },

  deleteProducto: async (id: number): Promise<void> => {
    await axios.delete(RUTAS_PRODUCTOS.POR_ID(id));
  },

  // Legacy methods (maintain backward compatibility)
  getProductosByCategoria: async (nombreCategoria: string): Promise<Producto[]> => {
    const response = await axios.get<Producto[]>(RUTAS_PRODUCTOS.POR_CATEGORIA(nombreCategoria));
    return response.data;
  },

  getProductosByProveedor: async (nombreProveedor: string): Promise<Producto[]> => {
    const response = await axios.get<Producto[]>(RUTAS_PRODUCTOS.POR_PROVEEDOR(nombreProveedor));
    return response.data;
  },
};