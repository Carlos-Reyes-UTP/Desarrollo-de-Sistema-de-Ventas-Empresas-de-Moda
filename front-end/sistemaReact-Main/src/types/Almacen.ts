export interface Ubicacion {
  idUbicacion: number;
  nombre: string;
  area: string | null;
  descripcion: string | null;
}

/** GET pisos/{piso}/resumen-stock */
export interface AreaStockResumen {
  idUbicacion: number;
  nombre: string;
  area: string | null;
  descripcion: string | null;
  totalUnidades: number;
  totalVariantesConStock: number;
}

export interface StockUbicacion {
  idVariante: number;
  idProducto: number | null;
  nombreProducto: string | null;
  codigoIdentificacion: string | null;
  color: string | null;
  talla: string | null;
  sku: string | null;
  stockActual: number;
  idUbicacion: number;
  nombreUbicacion: string;
  areaUbicacion: string | null;
}

export interface TrasladoInventarioPayload {
  idVariante: number;
  idUbicacionOrigen: number;
  idUbicacionDestino: number;
  cantidad: number;
}

/** Respuesta de GET /ubicaciones/stock/almacen */
export interface StockDesdeAlmacen {
  idUbicacionOrigen: number;
  nombreUbicacion: string;
  stock: StockUbicacion[];
}
