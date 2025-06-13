import apiClient from '../config/apiClient';
import { AxiosError } from 'axios';
import type { Talla } from '../interfaces/Talla';
import { RUTAS_TALLAS } from '../config/apiConfig';

export const TallaService = {
  // Obtener todas las tallas
  getAllTallas: async (): Promise<Talla[]> => {
    const response = await apiClient.get<Talla[]>(RUTAS_TALLAS.BASE);
    return response.data;
  },

  // Obtener tallas ordenadas por el campo 'orden'
  getTallasOrdenadas: async (): Promise<Talla[]> => {
    const response = await apiClient.get<Talla[]>(RUTAS_TALLAS.ORDENADAS);
    return response.data;
  },

  // Obtener talla por ID
  getTallaById: async (id: number): Promise<Talla | null> => {
    try {
      const response = await apiClient.get<Talla>(RUTAS_TALLAS.POR_ID(id));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Buscar tallas por nombre
  buscarTallas: async (nombre: string): Promise<Talla[]> => {
    const response = await apiClient.get<Talla[]>(RUTAS_TALLAS.BUSCAR(nombre));
    return response.data;
  },

  // Crear nueva talla
  createTalla: async (tallaData: Omit<Talla, 'idTalla'>): Promise<Talla> => {
    const response = await apiClient.post<Talla>(RUTAS_TALLAS.BASE, tallaData);
    return response.data;
  },

  // Actualizar talla
  updateTalla: async (id: number, tallaData: Talla): Promise<Talla> => {
    const response = await apiClient.put<Talla>(RUTAS_TALLAS.POR_ID(id), tallaData);
    return response.data;
  },

  // Eliminar talla
  deleteTalla: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_TALLAS.POR_ID(id));
  },
};
