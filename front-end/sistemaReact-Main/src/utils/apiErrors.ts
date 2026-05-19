import axios from "axios";

export function esPeticionCancelada(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return true;
  if (error instanceof Error && error.name === "CanceledError") return true;
  return false;
}

function esMensajeForbiddenGenerico(msg: string): boolean {
  const m = msg.trim().toLowerCase();
  return (
    m === "forbidden" ||
    m === "access denied" ||
    m === "access is denied" ||
    m.includes("access denied")
  );
}

/** Extrae mensaje legible del cuerpo de error de Spring / API. */
export function extraerMensajeServidor(data: unknown): string | undefined {
  if (typeof data === "string" && data.trim()) {
    const t = data.trim();
    return esMensajeForbiddenGenerico(t) ? undefined : t;
  }
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const o = data as Record<string, unknown>;
  const candidatos = [o.message, o.detail, o.error, o.title];
  for (const c of candidatos) {
    if (typeof c === "string" && c.trim() && !esMensajeForbiddenGenerico(c)) {
      return c.trim();
    }
  }
  return undefined;
}

function esUrlBusquedaCatalogoVendedor(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("/api/vendedor/catalogo") ||
    url.includes("catalogo-por-codigo")
  );
}

/** Mensaje para búsqueda de producto en piso de ventas (no confundir 404 con permisos). */
export function mensajeErrorBusquedaCatalogo(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const url = error.config?.url;
    const servidor = extraerMensajeServidor(error.response?.data);

    if (servidor) {
      return servidor;
    }

    if (
      status === 404 ||
      (status === 403 && esUrlBusquedaCatalogoVendedor(url))
    ) {
      return "No se encontró el producto.";
    }

    if (status === 403) {
      return "No tienes permiso para realizar esta acción.";
    }

    if (status === 409) {
      return "La solicitud ya no está pendiente o no se puede completar el movimiento de stock.";
    }

    if (error.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifica que el backend esté activo.";
    }
  }

  return "Ocurrió un error. Intenta de nuevo.";
}

export function mensajeErrorApi(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const servidor = extraerMensajeServidor(error.response?.data);

    if (servidor) {
      return servidor;
    }

    if (status === 404) {
      return "No se encontró el producto.";
    }

    if (status === 403) {
      return "No tienes permiso para realizar esta acción.";
    }

    if (status === 409) {
      return "La solicitud ya no está pendiente o no se puede completar el movimiento de stock.";
    }

    if (error.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifica que el backend esté activo.";
    }
  }
  return "Ocurrió un error. Intenta de nuevo.";
}
