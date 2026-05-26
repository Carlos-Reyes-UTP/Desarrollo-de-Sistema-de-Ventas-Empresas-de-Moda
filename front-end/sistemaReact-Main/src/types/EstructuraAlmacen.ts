export interface Piso {
  idUbicacion: number;
  nombre: string;
  activo: boolean;
  reservado: boolean;
}

export interface AreaCatalogo {
  idArea: number;
  nombre: string;
  activo: boolean;
}

export interface UbicacionOperativa {
  idUbicacionArea: number;
  idUbicacion: number;
  nombrePiso: string;
  idArea: number;
  nombreArea: string;
  activo: boolean;
  pisoActivo: boolean;
  areaActivo: boolean;
  operativa: boolean;
  totalUnidades: number;
  totalVariantesConStock: number;
}

export interface CombinacionFaltante {
  idUbicacion: number;
  nombrePiso: string;
  idArea: number;
  nombreArea: string;
}

export interface CoberturaUbicaciones {
  pisosActivos: number;
  sectoresActivos: number;
  combinacionesPosibles: number;
  combinacionesExistentes: number;
  combinacionesFaltantes: number;
  faltantes: CombinacionFaltante[];
}

export interface ResumenGlobalUbicaciones {
  totalUbicaciones: number;
  totalOperativas: number;
  totalConStock: number;
  totalUnidades: number;
}

export interface UbicacionPisoGrupo {
  idUbicacion: number;
  nombrePiso: string;
  pisoActivo: boolean;
  reservado: boolean;
  ubicaciones: UbicacionOperativa[];
  totalUnidadesPiso: number;
  sectoresActivos: number;
  sectoresConStock: number;
}

export interface UbicacionesResumen {
  grupos: UbicacionPisoGrupo[];
  cobertura: CoberturaUbicaciones;
  global: ResumenGlobalUbicaciones;
}
