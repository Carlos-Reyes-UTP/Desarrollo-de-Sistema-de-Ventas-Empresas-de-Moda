export interface AlmacenSolicitudLinea {
  idVariante: number;
  sku: string;
  descripcion: string;
  cantidad: number;
}

export interface AlmacenSolicitudCard {
  idSolicitud: number;
  tipoSolicitud: string;
  fechaCreacion: string;
  idUsuario: number | null;
  nombreVendedor: string;
  lineas: AlmacenSolicitudLinea[];
}

export type MotivoRechazoApi = "SIN_STOCK_FISICO" | "PRENDA_DEFECTUOSA";
