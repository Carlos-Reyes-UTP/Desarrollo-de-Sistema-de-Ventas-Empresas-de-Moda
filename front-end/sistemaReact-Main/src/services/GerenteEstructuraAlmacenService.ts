import apiClient from '@/config/apiClient';
import { RUTAS_GERENTE_ESTRUCTURA } from '@/config/apiConfig';
import type {
  AreaCatalogo,
  CoberturaUbicaciones,
  CombinacionFaltante,
  Piso,
  ResumenGlobalUbicaciones,
  UbicacionOperativa,
  UbicacionPisoGrupo,
  UbicacionesResumen,
} from '@/types/EstructuraAlmacen';
import { num } from '@/utils/num';

function normalizarPiso(raw: unknown): Piso {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    idUbicacion: num(o.idUbicacion, 0),
    nombre: typeof o.nombre === 'string' ? o.nombre : '',
    activo: o.activo !== false,
    reservado: o.reservado === true,
  };
}

function normalizarArea(raw: unknown): AreaCatalogo {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    idArea: num(o.idArea, 0),
    nombre: typeof o.nombre === 'string' ? o.nombre : '',
    activo: o.activo !== false,
  };
}

function normalizarUbicacion(raw: unknown): UbicacionOperativa {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pisoActivo = o.pisoActivo !== false;
  const areaActivo = o.areaActivo !== false;
  const activo = o.activo !== false;
  return {
    idUbicacionArea: num(o.idUbicacionArea, 0),
    idUbicacion: num(o.idUbicacion, 0),
    nombrePiso: typeof o.nombrePiso === 'string' ? o.nombrePiso : '',
    idArea: num(o.idArea, 0),
    nombreArea: typeof o.nombreArea === 'string' ? o.nombreArea : '',
    activo,
    pisoActivo,
    areaActivo,
    operativa:
      o.operativa === true || (o.operativa === undefined && activo && pisoActivo && areaActivo),
    totalUnidades: num(o.totalUnidades, 0),
    totalVariantesConStock: num(o.totalVariantesConStock, 0),
  };
}

function normalizarCombinacionFaltante(raw: unknown): CombinacionFaltante {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    idUbicacion: num(o.idUbicacion, 0),
    nombrePiso: typeof o.nombrePiso === 'string' ? o.nombrePiso : '',
    idArea: num(o.idArea, 0),
    nombreArea: typeof o.nombreArea === 'string' ? o.nombreArea : '',
  };
}

function normalizarCobertura(raw: unknown): CoberturaUbicaciones {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const faltantesRaw = o.faltantes;
  return {
    pisosActivos: num(o.pisosActivos, 0),
    sectoresActivos: num(o.sectoresActivos, 0),
    combinacionesPosibles: num(o.combinacionesPosibles, 0),
    combinacionesExistentes: num(o.combinacionesExistentes, 0),
    combinacionesFaltantes: num(o.combinacionesFaltantes, 0),
    faltantes: Array.isArray(faltantesRaw)
      ? faltantesRaw.map(normalizarCombinacionFaltante)
      : [],
  };
}

function normalizarResumenGlobal(raw: unknown): ResumenGlobalUbicaciones {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    totalUbicaciones: num(o.totalUbicaciones, 0),
    totalOperativas: num(o.totalOperativas, 0),
    totalConStock: num(o.totalConStock, 0),
    totalUnidades: num(o.totalUnidades, 0),
  };
}

function normalizarGrupoPiso(raw: unknown): UbicacionPisoGrupo {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const ubicacionesRaw = o.ubicaciones;
  return {
    idUbicacion: num(o.idUbicacion, 0),
    nombrePiso: typeof o.nombrePiso === 'string' ? o.nombrePiso : '',
    pisoActivo: o.pisoActivo !== false,
    reservado: o.reservado === true,
    ubicaciones: Array.isArray(ubicacionesRaw)
      ? ubicacionesRaw.map(normalizarUbicacion)
      : [],
    totalUnidadesPiso: num(o.totalUnidadesPiso, 0),
    sectoresActivos: num(o.sectoresActivos, 0),
    sectoresConStock: num(o.sectoresConStock, 0),
  };
}

function normalizarUbicacionesResumen(raw: unknown): UbicacionesResumen {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const gruposRaw = o.grupos;
  return {
    grupos: Array.isArray(gruposRaw) ? gruposRaw.map(normalizarGrupoPiso) : [],
    cobertura: normalizarCobertura(o.cobertura),
    global: normalizarResumenGlobal(o.global),
  };
}

function mapList<T>(data: unknown, normalizer: (raw: unknown) => T): T[] {
  return Array.isArray(data) ? data.map(normalizer) : [];
}

export const GerenteEstructuraAlmacenService = {
  listarPisos: async (incluirInactivos = false, incluirReservados = true): Promise<Piso[]> => {
    const response = await apiClient.get<unknown>(RUTAS_GERENTE_ESTRUCTURA.PISOS, {
      params: { incluirInactivos, incluirReservados },
    });
    return mapList(response.data, normalizarPiso);
  },

  crearPiso: async (nombre: string): Promise<Piso> => {
    const response = await apiClient.post<unknown>(RUTAS_GERENTE_ESTRUCTURA.PISOS, { nombre });
    return normalizarPiso(response.data);
  },

  actualizarPiso: async (id: number, nombre: string): Promise<Piso> => {
    const response = await apiClient.patch<unknown>(RUTAS_GERENTE_ESTRUCTURA.PISO(id), { nombre });
    return normalizarPiso(response.data);
  },

  cambiarActivoPiso: async (id: number, activo: boolean): Promise<Piso> => {
    const response = await apiClient.patch<unknown>(RUTAS_GERENTE_ESTRUCTURA.PISO_ACTIVO(id), { activo });
    return normalizarPiso(response.data);
  },

  listarAreas: async (incluirInactivos = false): Promise<AreaCatalogo[]> => {
    const response = await apiClient.get<unknown>(RUTAS_GERENTE_ESTRUCTURA.AREAS, {
      params: { incluirInactivos },
    });
    return mapList(response.data, normalizarArea);
  },

  crearArea: async (nombre: string): Promise<AreaCatalogo> => {
    const response = await apiClient.post<unknown>(RUTAS_GERENTE_ESTRUCTURA.AREAS, { nombre });
    return normalizarArea(response.data);
  },

  actualizarArea: async (id: number, nombre: string): Promise<AreaCatalogo> => {
    const response = await apiClient.patch<unknown>(RUTAS_GERENTE_ESTRUCTURA.AREA(id), { nombre });
    return normalizarArea(response.data);
  },

  cambiarActivoArea: async (id: number, activo: boolean): Promise<AreaCatalogo> => {
    const response = await apiClient.patch<unknown>(RUTAS_GERENTE_ESTRUCTURA.AREA_ACTIVO(id), { activo });
    return normalizarArea(response.data);
  },

  listarUbicaciones: async (incluirInactivos = false): Promise<UbicacionOperativa[]> => {
    const response = await apiClient.get<unknown>(RUTAS_GERENTE_ESTRUCTURA.UBICACIONES, {
      params: { incluirInactivos },
    });
    return mapList(response.data, normalizarUbicacion);
  },

  listarUbicacionesResumen: async (incluirInactivos = false): Promise<UbicacionesResumen> => {
    const response = await apiClient.get<unknown>(RUTAS_GERENTE_ESTRUCTURA.UBICACIONES_RESUMEN, {
      params: { incluirInactivos },
    });
    return normalizarUbicacionesResumen(response.data);
  },

  crearUbicacion: async (idUbicacion: number, idArea: number): Promise<UbicacionOperativa> => {
    const response = await apiClient.post<unknown>(RUTAS_GERENTE_ESTRUCTURA.UBICACIONES, {
      idUbicacion,
      idArea,
    });
    return normalizarUbicacion(response.data);
  },

  cambiarActivoUbicacion: async (id: number, activo: boolean): Promise<UbicacionOperativa> => {
    const response = await apiClient.patch<unknown>(RUTAS_GERENTE_ESTRUCTURA.UBICACION_ACTIVO(id), {
      activo,
    });
    return normalizarUbicacion(response.data);
  },
};
