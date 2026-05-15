import apiClient from "../config/apiClient";
import { RUTAS_ALMACEN } from "../config/apiConfig";
import type {
  AreaStockResumen,
  StockDesdeAlmacen,
  StockUbicacion,
  TrasladoInventarioPayload,
  Ubicacion,
} from "../types/Almacen";

export const AlmacenService = {
  listarPisos: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>(RUTAS_ALMACEN.PISOS);
    return response.data;
  },

  listarAreasDePiso: async (nombrePiso: string): Promise<Ubicacion[]> => {
    const response = await apiClient.get<Ubicacion[]>(
      RUTAS_ALMACEN.AREAS_POR_PISO(nombrePiso)
    );
    return response.data;
  },

  resumenStockAreasDePiso: async (nombrePiso: string): Promise<AreaStockResumen[]> => {
    const response = await apiClient.get<AreaStockResumen[]>(
      RUTAS_ALMACEN.RESUMEN_STOCK_PISO(nombrePiso)
    );
    return response.data;
  },

  listarOrigenesPosibles: async (idDestino: number): Promise<Ubicacion[]> => {
    const response = await apiClient.get<Ubicacion[]>(
      RUTAS_ALMACEN.ORIGENES_POSIBLES(idDestino)
    );
    return response.data;
  },

  stockDesdeAlmacen: async (): Promise<StockDesdeAlmacen> => {
    const response = await apiClient.get<StockDesdeAlmacen>(RUTAS_ALMACEN.STOCK_DESDE_ALMACEN);
    return response.data;
  },

  buscarStockOrigenTraslado: async (
    q: string,
    limit = 30,
    signal?: AbortSignal,
    soloAlmacen = false
  ): Promise<StockUbicacion[]> => {
    const response = await apiClient.get<StockUbicacion[]>(
      RUTAS_ALMACEN.STOCK_ALMACEN_BUSCAR(q, limit, soloAlmacen),
      { signal }
    );
    return response.data;
  },

  stockPorUbicacion: async (idUbicacion: number): Promise<StockUbicacion[]> => {
    const response = await apiClient.get<StockUbicacion[]>(
      RUTAS_ALMACEN.STOCK_POR_UBICACION(idUbicacion)
    );
    return response.data;
  },

  moverMercaderia: async (payload: TrasladoInventarioPayload): Promise<void> => {
    await apiClient.post<void>(RUTAS_ALMACEN.TRASLADO, payload);
  },
};
