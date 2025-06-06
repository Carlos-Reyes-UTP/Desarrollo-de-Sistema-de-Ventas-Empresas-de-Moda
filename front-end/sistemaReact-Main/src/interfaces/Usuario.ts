import type { RolNombre } from './enums';

export interface Rol {
  idRol?: number;
  nombreRol: RolNombre;
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