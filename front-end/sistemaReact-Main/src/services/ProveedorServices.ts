import { RUTAS_PROVEEDORES } from '../config/apiConfig';
import type { Proveedor } from '../interfaces/Proveedor';
import apiClient from '../config/apiClient';

export const ProveedorService = {
  obtenerTodosProveedores: async (): Promise<Proveedor[]> => {
    const response = await apiClient.get<Proveedor[]>(RUTAS_PROVEEDORES.BASE);
    return response.data;
  },

  obtenerProveedorPorId: async (id: number): Promise<Proveedor> => {
    const response = await apiClient.get<Proveedor>(RUTAS_PROVEEDORES.POR_ID(id));
    return response.data;
  },

  crearProveedor: async (datosProveedor: Omit<Proveedor, 'idProveedor'>): Promise<Proveedor> => {
    const response = await apiClient.post<Proveedor>(RUTAS_PROVEEDORES.BASE, datosProveedor);
    return response.data;
  },

  actualizarProveedor: async (id: number, datosProveedor: Proveedor): Promise<Proveedor> => {
    const response = await apiClient.put<Proveedor>(RUTAS_PROVEEDORES.POR_ID(id), datosProveedor);
    return response.data;
  },

  eliminarProveedor: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_PROVEEDORES.POR_ID(id));
  },

  obtenerProveedorPorNombre: async (nombre: string): Promise<Proveedor | null> => {
    try {
      const response = await apiClient.get<Proveedor>(RUTAS_PROVEEDORES.POR_NOMBRE(nombre));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },
};