export interface UbicacionArea {
  idUbicacionArea: number;
  nombre: string;
  area: string | null;
  descripcion?: string | null;
}

/** GET pisos/{piso}/resumen-stock */
export interface AreaStockResumen {
  idUbicacionArea: number;
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
  idUbicacionArea: number;
  nombreUbicacion: string;
  areaUbicacion: string | null;
}

export interface TrasladoInventarioPayload {
  idVariante: number;
  idUbicacionAreaOrigen: number;
  idUbicacionAreaDestino: number;
  cantidad: number;
}

export interface ItemTraslado {
  idVariante: number;
  cantidad: number;
}

export interface TrasladoMasivoPayload {
  idUbicacionAreaOrigen: number;
  idUbicacionAreaDestino: number;
  items: ItemTraslado[];
}

/** Respuesta de GET /ubicaciones/stock/almacen */
export interface StockDesdeAlmacen {
  idUbicacionAreaOrigen: number;
  etiquetaAlmacen: string;
  stock: StockUbicacion[];
}

/* ───── Historial de movimientos ───── */

export interface MovimientoDetalle {
  idVariante: number;
  color: string;
  talla: string;
  sku: string;
  cantidad: number;
}

export interface MovimientoHistorialItem {
  idGrupo: string;
  usuarioNombre: string;
  origenNombre: string;
  destinoNombre: string;
  productoNombre: string;
  idProducto: number;
  cantidadTotal: number;
  fecha: string;
  detalles: MovimientoDetalle[];
}
