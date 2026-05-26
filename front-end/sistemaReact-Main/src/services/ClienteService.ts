import { RUTAS_CLIENTES } from '../config/apiConfig';
import apiClient from '../config/apiClient';
import type { Cliente } from '../types/Cliente';
import axios from 'axios';

export const ClienteService = {
  obtenerTodosClientes: async (): Promise<Cliente[]> => {
    const response = await apiClient.get<Cliente[]>(RUTAS_CLIENTES.BASE);
    return response.data;
  },

  obtenerClientePorId: async (id: number): Promise<Cliente | null> => {
    try {
      const response = await apiClient.get<Cliente>(RUTAS_CLIENTES.POR_ID(id));
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  crearCliente: async (datosCliente: Omit<Cliente, 'idCliente'>): Promise<Cliente> => {
    const response = await apiClient.post<Cliente>(RUTAS_CLIENTES.BASE, datosCliente);
    return response.data;
  },

  actualizarCliente: async (id: number, datosCliente: Cliente): Promise<Cliente> => {
    const response = await apiClient.put<Cliente>(RUTAS_CLIENTES.POR_ID(id), datosCliente);
    return response.data;
  },

  eliminarCliente: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_CLIENTES.POR_ID(id));
  },

  obtenerClientePorDocumento: async (numeroDocumento: string): Promise<Cliente | null> => {
    try {
      const response = await apiClient.get<Cliente>(RUTAS_CLIENTES.POR_DOCUMENTO(numeroDocumento));
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  
  obtenerClientePorDNI: async (numero: string): Promise<Cliente | null> => {
    try {
      const response = await apiClient.get<Cliente>(RUTAS_CLIENTES.POR_DNI(numero));
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  
  obtenerClientePorRUC: async (numero: string): Promise<Cliente | null> => {
    try {
      const response = await apiClient.get<Cliente>(RUTAS_CLIENTES.POR_RUC(numero));
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
};