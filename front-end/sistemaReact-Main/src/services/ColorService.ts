import apiClient from '../config/apiClient';
import { AxiosError } from 'axios';
import type { Color } from '../interfaces/Color';
import { RUTAS_COLORES } from '../config/apiConfig';

export const ColorService = {
  // Obtener todos los colores
  getAllColores: async (): Promise<Color[]> => {
    const response = await apiClient.get<Color[]>(RUTAS_COLORES.BASE);
    return response.data;
  },

  // Obtener color por ID
  getColorById: async (id: number): Promise<Color | null> => {
    try {
      const response = await apiClient.get<Color>(RUTAS_COLORES.POR_ID(id));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Buscar colores por nombre
  buscarColores: async (nombre: string): Promise<Color[]> => {
    const response = await apiClient.get<Color[]>(RUTAS_COLORES.BUSCAR(nombre));
    return response.data;
  },
  // Crear nuevo color
  createColor: async (colorData: Omit<Color, 'idColor'>): Promise<Color> => {
    const response = await apiClient.post<Color>(RUTAS_COLORES.BASE, colorData);
    return response.data;
  },

  // Actualizar color
  updateColor: async (id: number, colorData: Color): Promise<Color> => {
    const response = await apiClient.put<Color>(RUTAS_COLORES.POR_ID(id), colorData);
    return response.data;
  },

  // Eliminar color
  deleteColor: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_COLORES.POR_ID(id));
  },
};
