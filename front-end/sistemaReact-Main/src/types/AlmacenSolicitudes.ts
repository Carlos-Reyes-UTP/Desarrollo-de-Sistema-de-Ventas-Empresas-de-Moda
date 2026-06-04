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
  idUbicacionAreaOrigen: number | null;
  pisoOrigen: string | null;
  sectorOrigen: string | null;
  etiquetaOrigen: string | null;
  idUbicacionAreaDestino: number | null;
  pisoDestino: string | null;
  sectorDestino: string | null;
  etiquetaDestino: string | null;
  lineas: ItemSolicitudAlmacen[];
  /** Ticket generado desde alerta de reposición (aún sin solicitud en cola). */
  desdeAlerta?: boolean;
  idVarianteAlerta?: number;
  idUbicacionAreaAlerta?: number;
  /** Stock actual en piso (solo tickets desde alerta). */
  stockPisoAlerta?: number;
  /** Objetivo de stock en piso (solo tickets desde alerta). */
  stockObjetivoAlerta?: number;
}

/** Ticket de picking: una solicitud o varias del mismo lote consolidadas. */
export interface AlmacenTicketConsolidado extends AlmacenSolicitud {
  idsEnLote?: number[];
  /** Destinos adicionales cuando el lote agrupa varias solicitudes a distintos pisos. */
  destinosEnLote?: Array<{
    piso: string | null;
    area: string | null;
    etiqueta: string | null;
  }>;
}

export type MotivoRechazoApi = "SIN_STOCK_FISICO" | "PRENDA_DEFECTUOSA";

export interface AlmacenAtenderLoteResult {
  atendidos: number[];
  rechazados: number[];
}
