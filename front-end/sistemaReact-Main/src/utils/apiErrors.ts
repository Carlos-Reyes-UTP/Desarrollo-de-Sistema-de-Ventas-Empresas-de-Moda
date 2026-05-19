import axios from "axios";

export function esPeticionCancelada(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return true;
  if (error instanceof Error && error.name === "CanceledError") return true;
  return false;
}

export function mensajeErrorApi(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as { message?: string } | string | undefined;
    if (d && typeof d === "object" && typeof d.message === "string") {
      return d.message;
    }
    if (typeof d === "string" && d.length > 0) {
      return d;
    }
    if (error.response?.status === 403) {
      return "No tienes permiso para esta acción. Inicia sesión como almacenero o administrador.";
    }
    if (error.response?.status === 409) {
      return (
        (typeof d === "object" && d?.message) ||
        "La solicitud ya no está pendiente o no se puede completar el movimiento de stock."
      );
    }
    if (error.response?.status === 404) {
      return "No se encontro el producto";
    }
    if (error.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifica que el backend esté activo.";
    }
  }
  return "Ocurrio un error. Intenta de nuevo.";
}
