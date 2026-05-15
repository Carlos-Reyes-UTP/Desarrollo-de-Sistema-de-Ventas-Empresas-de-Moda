import type { RolNombre } from './enums';

export interface Rol {
  idRol?: number;
  nombreRol: RolNombre;
}

// Interfaz para la respuesta del back-end donde roles viene como Set<String>
export interface UsuarioBackend {
  id?: number;
  usuario: string;
  password?: string;
  activo?: boolean;
  roles?: string[] | Set<string> | Record<string, unknown>; // Flexible para manejar diferentes formatos
}

export interface Usuario {
  id?: number;
  usuario: string;
  password?: string;
  activo?: boolean;
  roles?: Rol[];
}

export interface CredencialesLogin {
  usuario: string;
  clave: string;
}

export interface RespuestaAutenticacion {
  username: string;
  message: string;
  jwt: string;
  status: boolean;
}

// DTO para actualizar usuarios (coincide con UsuarioDTO del back-end)
export interface ActualizarUsuarioDTO {
  id?: number;
  usuario: string;
  clave?: string; // Opcional para actualizaciones
  activo: boolean;
  roles?: string[]; // Array de strings con los nombres de roles
}