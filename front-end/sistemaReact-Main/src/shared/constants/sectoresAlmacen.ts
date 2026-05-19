/** Sectores de catálogo en BD (tabla area) y usuarios demo de almacén. */
export const SECTORES_ALMACEN = ['Damas', 'Caballeros', 'Niños'] as const;

export const SECTOR_ALMACEN_GENERAL = 'General';

export const SECTORES_ALMACEN_CON_GENERAL = [
  SECTOR_ALMACEN_GENERAL,
  ...SECTORES_ALMACEN,
] as const;

export const SECTORES_ALMACEN_TEXTO = 'General, Damas, Caballeros, Niños';

/** Usuarios de prueba (contraseña: Prueba123!) */
export const USUARIOS_DEMO = {
  admin: 'administrador',
  cajero: 'cajero',
  supervisor: 'supervisor',
  vendedor: 'vendedor',
  almaceneroGeneral: 'almacenero general',
  almacenero1: 'almacenero 1',
  almacenero2: 'almacenero 2',
  almacenero3: 'almacenero 3',
} as const;
