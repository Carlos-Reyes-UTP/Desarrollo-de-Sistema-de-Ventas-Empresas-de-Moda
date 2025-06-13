import { RUTAS_VENTAS } from '../config/apiConfig';
import apiClient from '../config/apiClient';
import type { Venta } from '../interfaces/Venta'; 
import type { VentaInput } from '../interfaces/Venta'; 

export const VentaService = {
  obtenerTodasVentas: async (): Promise<Venta[]> => {
    const response = await apiClient.get<Venta[]>(RUTAS_VENTAS.BASE);
    return response.data;
  },

  obtenerVentaPorId: async (id: number): Promise<Venta | null> => {
    try {
      const response = await apiClient.get<Venta>(RUTAS_VENTAS.POR_ID(id));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },

  crearVenta: async (datosVenta: VentaInput): Promise<Venta> => {
    const response = await apiClient.post<Venta>(RUTAS_VENTAS.BASE, datosVenta);
    return response.data;
  },

  obtenerVentasPorFecha: async (fecha: string): Promise<Venta[]> => {
    const response = await apiClient.get<Venta[]>(RUTAS_VENTAS.POR_FECHA(fecha));
    return response.data;
  },

  obtenerVentasPorClienteId: async (idCliente: number): Promise<Venta[]> => {
    const response = await apiClient.get<Venta[]>(RUTAS_VENTAS.POR_CLIENTE(idCliente));
    return response.data;
  },

  obtenerVentaConDetalles: async (id: number): Promise<Venta | null> => {
     try {
      const response = await apiClient.get<Venta>(RUTAS_VENTAS.DETALLES(id));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },
};