import apiClient from "../config/apiClient";
import { RUTAS_VENDEDOR } from "../config/apiConfig";
import type {
  VendedorCatalogoBusqueda,
  VendedorCatalogoPorCodigo,
  VendedorCrearSolicitudPayload,
  VendedorCrearSolicitudLotePayload,
  VendedorCrearSolicitudLoteResult,
  VendedorProductoResumen,
  VendedorSolicitudResumen,
  VendedorUbicacion,
  VendedorVarianteCoincidencia,
  VendedorVarianteStock,
} from "../types/Vendedor";
import { num } from "../utils/num";

function normalizarProductoResumen(raw: unknown): VendedorProductoResumen {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idProducto: num(o.idProducto, 0),
    nombre: typeof o.nombre === "string" ? o.nombre : "",
    precioUnitario: num(o.precioUnitario, 0),
    stockTotal: num(o.stockTotal, 0),
  };
}

function normalizarVarianteCoincidencia(raw: unknown): VendedorVarianteCoincidencia {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cb = o.codigoBarras;
  return {
    idProductoVariante: num(o.idProductoVariante, 0),
    idProducto: num(o.idProducto, 0),
    nombreProducto: typeof o.nombreProducto === "string" ? o.nombreProducto : "",
    talla: typeof o.talla === "string" ? o.talla : "",
    color: typeof o.color === "string" ? o.color : "",
    sku: typeof o.sku === "string" ? o.sku : "",
    codigoBarras: typeof cb === "string" ? cb : cb == null ? "" : String(cb),
    precioUnitario: num(o.precioUnitario, 0),
    stockAlmacen: num(o.stockAlmacen, 0),
  };
}

function normalizarVariante(raw: unknown): VendedorVarianteStock {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cb = o.codigoBarras;
  const idDest = o.idUbicacionAreaDestino ?? o.idUbicacionDestino;
  return {
    idProductoVariante: num(o.idProductoVariante, 0),
    talla: typeof o.talla === "string" ? o.talla : "",
    color: typeof o.color === "string" ? o.color : "",
    codigoBarras: typeof cb === "string" ? cb : cb == null ? null : String(cb),
    stockAlmacen: num(o.stockAlmacen, 0),
    idUbicacionAreaDestino:
      idDest != null && idDest !== "" ? num(idDest, NaN) || null : null,
    nombreUbicacion:
      typeof o.nombreUbicacion === "string" && o.nombreUbicacion.trim() !== ""
        ? o.nombreUbicacion
        : null,
  };
}

function normalizarCatalogo(raw: unknown): VendedorCatalogoPorCodigo {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const variantesRaw = o.variantes;
  const variantes: VendedorVarianteStock[] = Array.isArray(variantesRaw)
    ? variantesRaw.map(normalizarVariante)
    : [];
  const preVal = o.idVariantePreseleccionada;
  let idVariantePreseleccionada: number | null = null;
  if (preVal !== null && preVal !== undefined) {
    const pv = num(preVal, NaN);
    if (!Number.isNaN(pv)) {
      idVariantePreseleccionada = pv;
    }
  }
  return {
    producto: normalizarProductoResumen(o.producto),
    idVariantePreseleccionada,
    variantes,
  };
}

function normalizarBusqueda(raw: unknown): VendedorCatalogoBusqueda {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const multi = Boolean(o.multiresultado);
  const opcRaw = o.opciones;
  const opciones: VendedorVarianteCoincidencia[] = Array.isArray(opcRaw)
    ? opcRaw.map(normalizarVarianteCoincidencia)
    : [];
  const cat = o.catalogo;
  return {
    multiresultado: multi,
    opciones,
    catalogo: cat && typeof cat === "object" ? normalizarCatalogo(cat) : null,
  };
}

function normalizarSolicitudResumen(raw: unknown): VendedorSolicitudResumen {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    idSolicitud: num(o.idSolicitud, 0),
    tipoSolicitud:
      typeof o.tipoSolicitud === "string" ? o.tipoSolicitud : "REPOSICION",
    estado: typeof o.estado === "string" ? o.estado : "",
    fechaCreacion: typeof o.fechaCreacion === "string" ? o.fechaCreacion : "",
    cantidad: num(o.cantidad, 0),
    idVariante: num(o.idVariante, 0),
    nombreProducto: typeof o.nombreProducto === "string" ? o.nombreProducto : "",
    talla: typeof o.talla === "string" ? o.talla : "",
    color: typeof o.color === "string" ? o.color : "",
  };
}

export const VendedorService = {
  buscarCatalogo: async (
    termino: string,
    signal?: AbortSignal
  ): Promise<VendedorCatalogoBusqueda> => {
    const t = termino.trim();
    const useQuery = t.length > 60;
    const url = useQuery
      ? `${RUTAS_VENDEDOR.CATALOGO_QUERY(t)}`
      : RUTAS_VENDEDOR.CATALOGO_POR_CODIGO(t);
    const response = await apiClient.get<unknown>(url, { signal });
    return normalizarBusqueda(response.data);
  },

  catalogoPorProducto: async (
    idProducto: number,
    signal?: AbortSignal
  ): Promise<VendedorCatalogoPorCodigo> => {
    const response = await apiClient.get<unknown>(
      RUTAS_VENDEDOR.CATALOGO_POR_PRODUCTO(idProducto),
      { signal }
    );
    return normalizarCatalogo(response.data);
  },

  catalogoPorVariante: async (
    idVariante: number,
    signal?: AbortSignal
  ): Promise<VendedorCatalogoPorCodigo> => {
    const response = await apiClient.get<unknown>(
      RUTAS_VENDEDOR.CATALOGO_POR_VARIANTE(idVariante),
      { signal }
    );
    return normalizarCatalogo(response.data);
  },

  crearSolicitud: async (
    payload: VendedorCrearSolicitudPayload
  ): Promise<{ idSolicitud: number }> => {
    const response = await apiClient.post<{ idSolicitud: number }>(
      RUTAS_VENDEDOR.SOLICITUDES,
      payload
    );
    return response.data;
  },

  /** Envío agrupado: una solicitud por área destino (evita tickets duplicados). */
  crearSolicitudLote: async (
    payload: VendedorCrearSolicitudLotePayload
  ): Promise<VendedorCrearSolicitudLoteResult> => {
    const response = await apiClient.post<VendedorCrearSolicitudLoteResult>(
      RUTAS_VENDEDOR.SOLICITUDES_LOTE,
      payload
    );
    return response.data;
  },

  misSolicitudesHoy: async (
    signal?: AbortSignal
  ): Promise<VendedorSolicitudResumen[]> => {
    const response = await apiClient.get<unknown[]>(RUTAS_VENDEDOR.MIS_SOLICITUDES, {
      signal,
    });
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map(normalizarSolicitudResumen);
  },

  /**
   * Lista los pisos/áreas disponibles como destino de una solicitud de venta.
   * Excluye ubicaciones reservadas del almacén central.
   */
  listarUbicaciones: async (
    signal?: AbortSignal
  ): Promise<VendedorUbicacion[]> => {
    const response = await apiClient.get<unknown[]>(RUTAS_VENDEDOR.UBICACIONES, { signal });
    const arr = Array.isArray(response.data) ? response.data : [];
    return arr.map((raw) => {
      const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        idUbicacionArea: num(o.idUbicacionArea ?? o.idUbicacion, 0),
        nombre: typeof o.nombre === "string" ? o.nombre : "",
        area: typeof o.area === "string" ? o.area : null,
      };
    });
  },
};
