import type { RolNombre } from '@/types/enums';

/** Acceso al módulo de inventario/almacén (mismas pantallas que almacenero). */
export const ROLES_MODULO_ALMACEN: RolNombre[] = [
  'ROLE_ALMACENERO',
  'ROLE_SUPERVISOR_ALMACEN',
];

export const esRolModuloAlmacen = (tieneRol: (r: RolNombre) => boolean): boolean =>
  ROLES_MODULO_ALMACEN.some((rol) => tieneRol(rol));
