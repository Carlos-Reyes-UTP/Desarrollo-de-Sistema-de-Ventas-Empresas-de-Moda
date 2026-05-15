export function throwAuthError(error: any, action: string): never {
  const status = error.response?.status;
  if (status === 401) {
    throw new Error(
      `Error de autorizacion: Tu sesion ha expirado o no tienes permisos para ${action}. Inicia sesion como Almacenero o Administrador.`
    );
  }
  if (status === 403) {
    throw new Error(
      `Error de permisos: No tienes autorizacion para ${action}. Requiere rol de Almacenero o Administrador.`
    );
  }
  throw error;
}

export function throwAuthErrorShort(error: any, _action: string): never {
  const status = error.response?.status;
  if (status === 401) {
    throw new Error('Tu sesion ha expirado. Por favor, inicia sesion nuevamente.');
  }
  if (status === 403) {
    throw new Error('No tienes permisos para acceder a esta informacion.');
  }
  throw error;
}
