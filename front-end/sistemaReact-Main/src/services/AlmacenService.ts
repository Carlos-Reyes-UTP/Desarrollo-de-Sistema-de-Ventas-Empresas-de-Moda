import apiClient from "../config/apiClient";
import { RUTAS_ALMACEN } from "../config/apiConfig";
import type {
  AreaStockResumen,
  MovimientoHistorialItem,
  StockDesdeAlmacen,
  StockUbicacion,
  TrasladoInventarioPayload,
  TrasladoMasivoPayload,
  UbicacionArea,
} from "../types/Almacen";
import { num } from "../utils/num";

function normalizarUbicacionArea(raw: unknown): UbicacionArea {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idUbicacionArea: num(o.idUbicacionArea ?? o.idUbicacion, 0),
    nombre: typeof o.nombre === "string" ? o.nombre : "",
    area: typeof o.area === "string" ? o.area : o.area == null ? null : String(o.area),
    descripcion:
      typeof o.descripcion === "string"
        ? o.descripcion
        : o.descripcion == null
          ? null
          : String(o.descripcion),
  };
}

function normalizarAreaStockResumen(raw: unknown): AreaStockResumen {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idUbicacionArea: num(o.idUbicacionArea ?? o.idUbicacion, 0),
    nombre: typeof o.nombre === "string" ? o.nombre : "",
    area: typeof o.area === "string" ? o.area : o.area == null ? null : String(o.area),
    descripcion:
      typeof o.descripcion === "string"
        ? o.descripcion
        : o.descripcion == null
          ? null
          : String(o.descripcion),
    totalUnidades: num(o.totalUnidades, 0),
    totalVariantesConStock: num(o.totalVariantesConStock, 0),
  };
}

function normalizarStockUbicacion(raw: unknown): StockUbicacion {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idVariante: num(o.idVariante, 0),
    idProducto: o.idProducto != null ? num(o.idProducto, NaN) || null : null,
    nombreProducto: typeof o.nombreProducto === "string" ? o.nombreProducto : null,
    codigoIdentificacion:
      typeof o.codigoIdentificacion === "string" ? o.codigoIdentificacion : null,
    color: typeof o.color === "string" ? o.color : null,
    talla: typeof o.talla === "string" ? o.talla : null,
    sku: typeof o.sku === "string" ? o.sku : null,
    stockActual: num(o.stockActual, 0),
    idUbicacionArea: num(o.idUbicacionArea ?? o.idUbicacion, 0),
    nombreUbicacion: typeof o.nombreUbicacion === "string" ? o.nombreUbicacion : "",
    areaUbicacion:
      typeof o.areaUbicacion === "string"
        ? o.areaUbicacion
        : o.areaUbicacion == null
          ? null
          : String(o.areaUbicacion),
  };
}

function normalizarStockDesdeAlmacen(raw: unknown): StockDesdeAlmacen {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const stockRaw = o.stock;
  const stock = Array.isArray(stockRaw) ? stockRaw.map(normalizarStockUbicacion) : [];
  return {
    idUbicacionAreaOrigen: num(o.idUbicacionAreaOrigen ?? o.idUbicacionOrigen, 0),
    etiquetaAlmacen:
      typeof o.etiquetaAlmacen === "string"
        ? o.etiquetaAlmacen
        : typeof o.nombreUbicacion === "string"
          ? o.nombreUbicacion
          : "Almacen",
    stock,
  };
}

export const AlmacenService = {
  listarPisos: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>(RUTAS_ALMACEN.PISOS);
    return response.data;
  },

  listarAreasDePiso: async (nombrePiso: string): Promise<UbicacionArea[]> => {
    const response = await apiClient.get<unknown[]>(RUTAS_ALMACEN.AREAS_POR_PISO(nombrePiso));
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarUbicacionArea);
  },

  resumenStockAreasDePiso: async (nombrePiso: string): Promise<AreaStockResumen[]> => {
    const response = await apiClient.get<unknown[]>(
      RUTAS_ALMACEN.RESUMEN_STOCK_PISO(nombrePiso)
    );
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarAreaStockResumen);
  },

  listarOrigenesPosibles: async (idUbicacionAreaDestino: number): Promise<UbicacionArea[]> => {
    const response = await apiClient.get<unknown[]>(
      RUTAS_ALMACEN.ORIGENES_POSIBLES(idUbicacionAreaDestino)
    );
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarUbicacionArea);
  },

  stockDesdeAlmacen: async (sector?: string): Promise<StockDesdeAlmacen> => {
    const params = sector?.trim() ? { sector: sector.trim() } : undefined;
    const response = await apiClient.get<unknown>(RUTAS_ALMACEN.STOCK_DESDE_ALMACEN, { params });
    return normalizarStockDesdeAlmacen(response.data);
  },

  buscarStockOrigenTraslado: async (
    q: string,
    limit = 30,
    signal?: AbortSignal,
    soloAlmacen = false,
    sector?: string
  ): Promise<StockUbicacion[]> => {
    const response = await apiClient.get<unknown[]>(
      RUTAS_ALMACEN.STOCK_ALMACEN_BUSCAR(q, limit, soloAlmacen, sector),
      { signal }
    );
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarStockUbicacion);
  },

  stockPorUbicacionArea: async (idUbicacionArea: number): Promise<StockUbicacion[]> => {
    const response = await apiClient.get<unknown[]>(
      RUTAS_ALMACEN.STOCK_POR_UBICACION_AREA(idUbicacionArea)
    );
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarStockUbicacion);
  },

  moverMercaderia: async (payload: TrasladoInventarioPayload): Promise<void> => {
    await apiClient.post<void>(RUTAS_ALMACEN.TRASLADO, payload);
  },

  moverMercaderiaMasiva: async (payload: TrasladoMasivoPayload): Promise<void> => {
    await apiClient.post<void>(RUTAS_ALMACEN.TRASLADO_MASIVO, payload);
  },

  getHistorialMovimientos: async (
    mes: number,
    anio: number,
    page = 0,
    size = 20,
    idArea?: number,
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<{ content: MovimientoHistorialItem[]; totalElements: number; totalPages: number; number: number; size: number }> => {
    const params: Record<string, string | number> = { mes, anio, page, size };
    if (idArea != null) params.area = idArea;
    if (fechaDesde) params.fechaDesde = fechaDesde;
    if (fechaHasta) params.fechaHasta = fechaHasta;
    const response = await apiClient.get(RUTAS_ALMACEN.HISTORIAL_BASE, { params });
    return response.data;
  },
};
