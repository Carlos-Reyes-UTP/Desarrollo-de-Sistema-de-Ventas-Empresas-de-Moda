
import apiClient from "../config/apiClient";
import type { Categoria} from "../types/Categoria";
import type { CategoriaDTO } from "../types/CategoriaDTO";
import { RUTAS_CATEGORIAS } from "../config/apiConfig";

export const CategoriaService = {
  obtenerTodasCategorias: async (): Promise<Categoria[]> => {
    const response = await apiClient.get<Categoria[]>(RUTAS_CATEGORIAS.BASE);
    return response.data;
  },
  obtenerCategoriasPrincipales: async (): Promise<Categoria[]> => {
    const response = await apiClient.get<Categoria[]>(RUTAS_CATEGORIAS.PRINCIPALES);
    return response.data;
  },

  obtenerCategoriaPorId: async (id: number): Promise<Categoria> => {
    const response = await apiClient.get<Categoria>(RUTAS_CATEGORIAS.POR_ID(id));
    return response.data;
  },

  obtenerSubcategoriasPorIdPadre: async (idPadre: number): Promise<Categoria[]> => {
    const response = await apiClient.get<Categoria[]>(RUTAS_CATEGORIAS.SUBCATEGORIAS(idPadre));
    return response.data;
  },

  crearCategoria: async (datosCategoria: { nombre: string }): Promise<Categoria> => {
    const response = await apiClient.post<Categoria>(RUTAS_CATEGORIAS.BASE, datosCategoria);
    return response.data;
  },

  crearSubcategoria: async (idPadre: number, datosSubcategoria: { nombre: string }): Promise<Categoria> => {
    const response = await apiClient.post<Categoria>(RUTAS_CATEGORIAS.CREAR_SUBCATEGORIA(idPadre), datosSubcategoria);
    return response.data;
  },

  actualizarCategoria: async (id: number, datosCategoria: { nombre: string }): Promise<Categoria> => {
    const response = await apiClient.put<Categoria>(RUTAS_CATEGORIAS.POR_ID(id), datosCategoria);
    return response.data;
  },

  moverCategoria: async (idCategoria: number, idNuevoPadre: number | null): Promise<Categoria> => {
    const response = await apiClient.patch<Categoria>(RUTAS_CATEGORIAS.MOVER(idCategoria), { idNuevoPadre });
    return response.data;
  },

  eliminarCategoria: async (id: number): Promise<void> => {
    await apiClient.delete(RUTAS_CATEGORIAS.POR_ID(id));
  },

  buscarCategoriasPorNombre: async (nombre: string): Promise<Categoria[]> => {
    const response = await apiClient.get<Categoria[]>(RUTAS_CATEGORIAS.BUSCAR(nombre));
    return response.data;
  },

  obtenerArbolCategorias: async (): Promise<CategoriaDTO[]> => {
    const response = await apiClient.get<CategoriaDTO[]>(RUTAS_CATEGORIAS.ARBOL);
    return response.data;
  },

  crearCategoriaEnArbol: async (datosCategoria: { nombre: string }): Promise<Categoria> => {
    const response = await apiClient.post<Categoria>(RUTAS_CATEGORIAS.CREAR_EN_ARBOL, datosCategoria);
    return response.data;
  },
};
