type ApiErrorBody = { message?: string; error?: string };

function extractServerMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }
  if (typeof data === 'object' && data !== null) {
    const body = data as ApiErrorBody;
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error.trim();
    }
  }
  return undefined;
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Convierte errores HTTP de la API en mensajes claros para el usuario. */
export function throwAuthError(error: unknown, action: string): never {
  const status = httpStatus(error);
  const serverMsg = extractServerMessage(error);

  if (status === 401) {
    throw new Error(
      serverMsg ??
        `Error de autorización: Tu sesión ha expirado o no tienes permisos para ${action}. Inicia sesión nuevamente.`
    );
  }

  if (status === 403) {
    throw new Error(
      serverMsg ??
        `Error de permisos: No tienes autorización para ${action}. Si eres almacenero, verifica que tengas área asignada o contacta al administrador.`
    );
  }

  if (status === 409) {
    throw new Error(serverMsg ?? `Conflicto al ${action}: el registro ya existe o hay datos duplicados.`);
  }

  if (status === 400) {
    throw new Error(serverMsg ?? `Datos inválidos al ${action}. Revise el formulario.`);
  }

  if (serverMsg) {
    throw new Error(serverMsg);
  }

  if (error instanceof Error && error.message && !error.message.startsWith('Request failed')) {
    throw error;
  }

  throw new Error(`Error al ${action}. Intente de nuevo o contacte al administrador.`);
}

export function throwAuthErrorShort(error: unknown, action: string): never {
  const status = httpStatus(error);
  const serverMsg = extractServerMessage(error);

  if (status === 401) {
    throw new Error(serverMsg ?? `Tu sesión ha expirado. Inicia sesión nuevamente para ${action}.`);
  }
  if (status === 403) {
    throw new Error(serverMsg ?? `No tienes permisos para ${action}.`);
  }
  if (serverMsg) {
    throw new Error(serverMsg);
  }
  throw error instanceof Error ? error : new Error(`Error al ${action}. Problema de comunicación con el servidor.`);
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const serverMsg = extractServerMessage(error);
  if (serverMsg) {
    return serverMsg;
  }
  if (error instanceof Error && error.message && !error.message.startsWith('Request failed')) {
    return error.message;
  }
  return fallback;
}
