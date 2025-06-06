import { RUTAS_PROVEEDORES } from '../config/apiConfig';
import type { Proveedor } from '../interfaces/Proveedor';
import axios from 'axios';

export const ProveedorService = {
  obtenerTodosProveedores: async (): Promise<Proveedor[]> => {
    const response = await axios.get<Proveedor[]>(RUTAS_PROVEEDORES.BASE);
    return response.data;
  },

  obtenerProveedorPorId: async (id: number): Promise<Proveedor> => {
    const response = await axios.get<Proveedor>(RUTAS_PROVEEDORES.POR_ID(id));
    return response.data;
  },

  crearProveedor: async (datosProveedor: Omit<Proveedor, 'idProveedor'>): Promise<Proveedor> => {
    const response = await axios.post<Proveedor>(RUTAS_PROVEEDORES.BASE, datosProveedor);
    return response.data;
  },

  actualizarProveedor: async (id: number, datosProveedor: Proveedor): Promise<Proveedor> => {
    const response = await axios.put<Proveedor>(RUTAS_PROVEEDORES.POR_ID(id), datosProveedor);
    return response.data;
  },

  eliminarProveedor: async (id: number): Promise<void> => {
    await axios.delete(RUTAS_PROVEEDORES.POR_ID(id));
  },

  obtenerProveedorPorNombre: async (nombre: string): Promise<Proveedor | null> => {
    try {
      const response = await axios.get<Proveedor>(RUTAS_PROVEEDORES.POR_NOMBRE(nombre));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },
};