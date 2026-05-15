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
}
