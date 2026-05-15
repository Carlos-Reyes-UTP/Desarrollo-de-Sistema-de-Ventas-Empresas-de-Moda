import { RUTAS_VENTAS } from '../config/apiConfig';
import apiClient from '../config/apiClient';
import type { Venta } from '../types/Venta'; 
import type { VentaInput } from '../types/Venta'; 

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

  obtenerUsuarioActual: async (): Promise<{ id: number; usuario: string }> => {
    const response = await apiClient.get<{ id: number; usuario: string }>(RUTAS_VENTAS.USUARIO_ACTUAL);
    return response.data;
  },

  obtenerTotalVentasDelDia: async (fecha?: string): Promise<number> => {
    try {
      const fechaHoy = fecha ?? new Date().toISOString().split('T')[0];
      const ventas = await VentaService.obtenerVentasPorFecha(fechaHoy);
      return ventas.reduce((total, venta) => total + venta.totalVentas, 0);
    } catch (error) {
      console.error('Error al obtener total de ventas del día:', error);
      return 0;
    }
  },

  obtenerVentasDelDiaDetalladas: async (fecha?: string): Promise<{ total: number; efectivo: number; tarjeta: number; yape: number }> => {
    try {
      const fechaHoy = fecha ?? new Date().toISOString().split('T')[0];
      const ventas = await VentaService.obtenerVentasPorFecha(fechaHoy);
      
      let efectivo = 0;
      let tarjeta = 0;
      let yape = 0;
      
      ventas.forEach(venta => {
        if (venta.metodoPago?.nombre) {
          const metodo = venta.metodoPago.nombre.toLowerCase();
          if (metodo.includes('efectivo') || metodo.includes('cash')) {
            efectivo += venta.totalVentas;
          } else if (metodo.includes('tarjeta') || metodo.includes('visa') || metodo.includes('mastercard') || metodo.includes('card')) {
            tarjeta += venta.totalVentas;
          } else if (metodo.includes('yape') || metodo.includes('plin') || metodo.includes('digital')) {
            yape += venta.totalVentas;
          } else {
            // Si no se puede clasificar, asumimos efectivo por defecto
            efectivo += venta.totalVentas;
          }
        } else {
          // Si no hay método de pago, asumimos efectivo por defecto
          efectivo += venta.totalVentas;
        }
      });
      
      return {
        total: efectivo + tarjeta + yape,
        efectivo,
        tarjeta,
        yape
      };
    } catch (error) {
      console.error('Error al obtener ventas detalladas del día:', error);
      return {
        total: 0,
        efectivo: 0,
        tarjeta: 0,
        yape: 0
      };
    }
  },
};