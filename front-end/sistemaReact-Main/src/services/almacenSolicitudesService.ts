import apiClient from "../config/apiClient";
import { RUTAS_ALMACENERO_SOLICITUDES } from "../config/apiConfig";
import type { AlmacenSolicitud, ItemSolicitudAlmacen, MotivoRechazoApi } from "../types/AlmacenSolicitudes";
import { num } from "../utils/num";

function normalizarLinea(raw: unknown): ItemSolicitudAlmacen {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idVariante: num(o.idVariante, 0),
    sku: typeof o.sku === "string" ? o.sku : "",
    descripcion: typeof o.descripcion === "string" ? o.descripcion : "",
    cantidad: num(o.cantidad, 0),
  };
}

function normalizarSolicitud(raw: unknown): AlmacenSolicitud {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const lineasRaw = o.lineas;
  const lineas = Array.isArray(lineasRaw) ? lineasRaw.map(normalizarLinea) : [];
  const idUsuarioVal = o.idUsuario;
  let idUsuario: number | null = null;
  if (idUsuarioVal !== null && idUsuarioVal !== undefined) {
    const n = num(idUsuarioVal, NaN);
    idUsuario = Number.isNaN(n) ? null : n;
  }
  return {
    idSolicitud: num(o.idSolicitud, 0),
    tipoSolicitud: typeof o.tipoSolicitud === "string" ? o.tipoSolicitud : "REPOSICION",
    fechaCreacion: typeof o.fechaCreacion === "string" ? o.fechaCreacion : "",
    idUsuario,
    nombreVendedor: typeof o.nombreVendedor === "string" ? o.nombreVendedor : "",
    codigoLote: typeof o.codigoLote === "string" ? o.codigoLote : null,
    idUbicacionAreaOrigen: (() => {
      if (o.idUbicacionAreaOrigen == null) return null;
      const n = num(o.idUbicacionAreaOrigen, 0);
      return n > 0 ? n : null;
    })(),
    pisoOrigen: typeof o.pisoOrigen === "string" ? o.pisoOrigen : null,
    sectorOrigen: typeof o.sectorOrigen === "string" ? o.sectorOrigen : null,
    etiquetaOrigen: typeof o.etiquetaOrigen === "string" ? o.etiquetaOrigen : null,
    idUbicacionAreaDestino: (() => {
      if (o.idUbicacionAreaDestino == null) return null;
      const n = num(o.idUbicacionAreaDestino, 0);
      return n > 0 ? n : null;
    })(),
    pisoDestino: typeof o.pisoDestino === "string" ? o.pisoDestino : null,
    sectorDestino: typeof o.sectorDestino === "string" ? o.sectorDestino : null,
    etiquetaDestino: typeof o.etiquetaDestino === "string" ? o.etiquetaDestino : null,
    lineas,
  };
}

export const AlmacenSolicitudesApi = {
  cola: async (sector?: string, signal?: AbortSignal): Promise<AlmacenSolicitud[]> => {
    const params: Record<string, string> = {};
    if (sector != null && sector.trim() !== "") {
      params.sector = sector.trim();
    }
    const res = await apiClient.get<unknown[]>(RUTAS_ALMACENERO_SOLICITUDES.COLA, {
      params: Object.keys(params).length > 0 ? params : undefined,
      signal,
    });
    const arr = Array.isArray(res.data) ? res.data : [];
    return arr.map(normalizarSolicitud);
  },

  atender: async (idSolicitud: number): Promise<void> => {
    await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.ATENDER(idSolicitud));
  },

  atenderLote: async (idsSolicitud: number[]): Promise<void> => {
    const unicos = [...new Set(idsSolicitud.filter((id) => id > 0))];
    if (unicos.length === 0) return;
    if (unicos.length === 1) {
      await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.ATENDER(unicos[0]));
      return;
    }
    await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.ATENDER_LOTE, {
      idsSolicitud: unicos,
    });
  },

  rechazar: async (idSolicitud: number, motivo: MotivoRechazoApi): Promise<void> => {
    await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.RECHAZAR(idSolicitud), { motivo });
  },
};
