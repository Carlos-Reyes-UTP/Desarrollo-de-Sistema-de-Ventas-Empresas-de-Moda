import type { AreaCatalogo, Piso, UbicacionOperativa } from '@/types/EstructuraAlmacen';

export type CatalogoTab = 'pisos' | 'sectores' | 'ubicaciones';

export type FormPisoSector =
  | { tipo: 'piso'; modo: 'crear' | 'editar'; id?: number; nombre: string }
  | { tipo: 'sector'; modo: 'crear' | 'editar'; id?: number; nombre: string };

export type FormUbicacion = {
  idUbicacion: number;
  idArea: number;
};

export type ConfirmDesactivar = {
  entidad: 'piso' | 'sector' | 'ubicacion';
  id: number;
  nombre: string;
  tieneStock?: boolean;
};

export type MensajeAccion = {
  visible: boolean;
  tipo: 'success' | 'error';
  texto: string;
};

export type EstructuraAlmacenState = {
  vista: 'catalogo' | 'inventario';
  tab: CatalogoTab;
  incluirInactivos: boolean;
  pisos: Piso[];
  sectores: AreaCatalogo[];
  ubicaciones: UbicacionOperativa[];
  cargando: boolean;
  error: string | null;
  mensaje: MensajeAccion;
  stockRefreshKey: number;
  formPisoSector: FormPisoSector | null;
  formUbicacion: FormUbicacion | null;
  confirmDesactivar: ConfirmDesactivar | null;
  guardando: boolean;
};
