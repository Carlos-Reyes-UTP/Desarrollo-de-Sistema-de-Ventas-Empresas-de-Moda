export interface VendedorProductoResumen {
  idProducto: number;
  nombre: string;
  precioUnitario: number;
  stockTotal: number;
}

export interface VendedorVarianteStock {
  idProductoVariante: number;
  talla: string;
  color: string;
  codigoBarras: string | null;
  stockAlmacen: number;
  /** Área destino ya conocida. null = producto nuevo sin área asignada aún. */
  idUbicacionAreaDestino: number | null;
  /** Nombre legible del área destino. null si no está asignada. */
  nombreUbicacion: string | null;
}

export interface VendedorCatalogoPorCodigo {
  producto: VendedorProductoResumen;
  idVariantePreseleccionada: number | null;
  variantes: VendedorVarianteStock[];
}

export interface VendedorVarianteCoincidencia {
  idProductoVariante: number;
  idProducto: number;
  nombreProducto: string;
  talla: string;
  color: string;
  sku: string;
  codigoBarras: string;
  precioUnitario: number;
  stockAlmacen: number;
}

export interface VendedorCatalogoBusqueda {
  multiresultado: boolean;
  opciones: VendedorVarianteCoincidencia[];
  catalogo: VendedorCatalogoPorCodigo | null;
}

export type VendedorTipoSolicitud = "VENTA" | "REPOSICION";

export interface VendedorSolicitudResumen {
  idSolicitud: number;
  tipoSolicitud: string;
  estado: string;
  fechaCreacion: string;
  cantidad: number;
  idVariante: number;
  nombreProducto: string;
  talla: string;
  color: string;
}

export interface VendedorCrearSolicitudPayload {
  idVariante: number;
  cantidad: number;
  tipoSolicitud?: VendedorTipoSolicitud;
  /** Área/piso destino seleccionada por el vendedor. */
  idUbicacionAreaDestino?: number;
  /** Identificador de lote/ticket para agrupar múltiples ítems. */
  codigoLote?: string;
}

export interface VendedorCrearSolicitudLotePayload {
  codigoLote?: string;
  items: Array<{
    idVariante: number;
    cantidad: number;
    idUbicacionAreaDestino: number;
  }>;
}

export interface VendedorCrearSolicitudLoteResult {
  codigoLote: string;
  idsSolicitud: number[];
}

/** Ubicación (piso/área) disponible como destino para solicitudes del vendedor. */
export interface VendedorUbicacion {
  idUbicacionArea: number;
  nombre: string;
  area: string | null;
}
