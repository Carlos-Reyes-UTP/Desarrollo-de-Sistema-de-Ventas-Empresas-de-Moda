export interface ItemSolicitudAlmacen {
  idVariante: number;
  sku: string;
  descripcion: string;
  cantidad: number;
}

export interface AlmacenSolicitud {
  idSolicitud: number;
  tipoSolicitud: string;
  fechaCreacion: string;
  idUsuario: number | null;
  nombreVendedor: string;
  codigoLote: string | null;
  lineas: ItemSolicitudAlmacen[];
}

/** Ticket de picking: una solicitud o varias del mismo lote consolidadas. */
export interface AlmacenTicketConsolidado extends AlmacenSolicitud {
  idsEnLote?: number[];
}

export type MotivoRechazoApi = "SIN_STOCK_FISICO" | "PRENDA_DEFECTUOSA";
