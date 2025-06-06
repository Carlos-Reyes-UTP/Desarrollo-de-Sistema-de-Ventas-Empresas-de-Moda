import { RUTAS_CLIENTES } from '../config/apiConfig';
import axios from 'axios';
import type { Cliente } from '../interfaces/Cliente';

export const ClienteService = {
  obtenerTodosClientes: async (): Promise<Cliente[]> => {
    const response = await axios.get<Cliente[]>(RUTAS_CLIENTES.BASE);
    return response.data;
  },

  obtenerClientePorId: async (id: number): Promise<Cliente | null> => {
    try {
      const response = await axios.get<Cliente>(RUTAS_CLIENTES.POR_ID(id));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },

  crearCliente: async (datosCliente: Omit<Cliente, 'idCliente'>): Promise<Cliente> => {
    const response = await axios.post<Cliente>(RUTAS_CLIENTES.BASE, datosCliente);
    return response.data;
  },

  actualizarCliente: async (id: number, datosCliente: Cliente): Promise<Cliente> => {
    const response = await axios.put<Cliente>(RUTAS_CLIENTES.POR_ID(id), datosCliente);
    return response.data;
  },

  eliminarCliente: async (id: number): Promise<void> => {
    await axios.delete(RUTAS_CLIENTES.POR_ID(id));
  },

  obtenerClientePorDocumento: async (numeroDocumento: string): Promise<Cliente | null> => {
    try {
      const response = await axios.get<Cliente>(RUTAS_CLIENTES.POR_DOCUMENTO(numeroDocumento));
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) return null;
      throw error;
    }
  },
};