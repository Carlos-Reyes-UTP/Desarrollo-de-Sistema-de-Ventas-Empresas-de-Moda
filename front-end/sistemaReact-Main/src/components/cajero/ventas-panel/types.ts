export type TipoDescuento = 'mayorista' | 'docena' | 'mediaDocena' | 'cuarto' | null;

export interface PrecioCalculado {
  precio: number;
  precioOriginal: number;
  tipoDescuento: TipoDescuento;
}

export interface ProductoBoleta {
  idProductoVariante: number;
  idProducto: number;
  descripcion: string;
  cantidad: number;
  precioUnitarioAplicado: number;
  precioOriginal: number;
  tipoDescuento: TipoDescuento;
  totalParcial: number;
  ahorro: number;
}

export interface DatosVentaBoleta {
  cliente: string;
  documentoCliente?: string | null;
  metodoPago: string;
  usuarioVendedor: string;
  productos: ProductoBoleta[];
  subtotal: number;
  igv: number;
  totalGeneral: number;
  fechaHora: string;
}

