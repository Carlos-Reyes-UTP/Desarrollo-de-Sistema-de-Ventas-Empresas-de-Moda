export interface MayoristaDTO {
  idMayorista?: number; // ID único del mayorista para operaciones como eliminar
  idCliente: number;
  codigoMayorista: string;
  nombreCliente: string;
  tipoCliente: string;
  numeroDocumento: string;
}

// Interfaz para crear un mayorista completo (cliente + mayorista)
export interface CrearMayoristaCompletoDTO {
  // Datos del cliente
  nombreCliente: string;
  tipoCliente: string;
  numeroDocumento: string;
  // El código se genera automáticamente en el backend
}
