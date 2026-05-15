import apiClient from "../config/apiClient";
import { RUTAS_ALMACENERO_SOLICITUDES } from "../config/apiConfig";
import type { AlmacenSolicitudCard, MotivoRechazoApi } from "../types/AlmacenCola";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function normalizarLinea(raw: unknown): AlmacenSolicitudCard["lineas"][0] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idVariante: num(o.idVariante, 0),
    sku: typeof o.sku === "string" ? o.sku : "",
    descripcion: typeof o.descripcion === "string" ? o.descripcion : "",
    cantidad: num(o.cantidad, 0),
  };
}

function normalizarCard(raw: unknown): AlmacenSolicitudCard {
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
    lineas,
  };
}

export const AlmacenSolicitudesApi = {
  cola: async (signal?: AbortSignal): Promise<AlmacenSolicitudCard[]> => {
    const res = await apiClient.get<unknown[]>(RUTAS_ALMACENERO_SOLICITUDES.COLA, {
      signal,
    });
    const arr = Array.isArray(res.data) ? res.data : [];
    return arr.map(normalizarCard);
  },

  atender: async (idSolicitud: number): Promise<void> => {
    await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.ATENDER(idSolicitud));
  },

  rechazar: async (idSolicitud: number, motivo: MotivoRechazoApi): Promise<void> => {
    await apiClient.post(RUTAS_ALMACENERO_SOLICITUDES.RECHAZAR(idSolicitud), { motivo });
  },
};
