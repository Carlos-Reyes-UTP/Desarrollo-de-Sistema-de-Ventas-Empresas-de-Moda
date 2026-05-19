import apiClient from '../config/apiClient';
import { RUTAS_INVENTARIO_CONTEXTO } from '../config/apiConfig';
import type { AccesoAreaAlmacen, ResumenStockArea } from '../types/AccesoAreaAlmacen';
import type { UbicacionArea } from '../types/Almacen';
import { num } from '../utils/num';

function normalizarUbicacion(raw: unknown): UbicacionArea {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const nombre = typeof o.nombre === 'string' ? o.nombre : '';
  const area = typeof o.area === 'string' ? o.area : o.area == null ? null : String(o.area);
  return {
    idUbicacionArea: num(o.idUbicacionArea ?? o.idUbicacion, 0),
    nombre,
    area,
    descripcion:
      typeof o.descripcion === 'string'
        ? o.descripcion
        : o.descripcion == null
          ? null
          : String(o.descripcion),
  };
}

function normalizarAcceso(raw: unknown): AccesoAreaAlmacen {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const areas = Array.isArray(o.areasAlmacen) ? o.areasAlmacen.map(normalizarUbicacion) : [];
  const destinos = Array.isArray(o.destinosTraslado) ? o.destinosTraslado.map(normalizarUbicacion) : [];
  return {
    rolPrincipal: typeof o.rolPrincipal === 'string' ? o.rolPrincipal : null,
    idUbicacionAreaAsignada:
      o.idUbicacionAreaAsignada == null ? null : num(o.idUbicacionAreaAsignada, 0),
    etiquetaAreaAsignada:
      typeof o.etiquetaAreaAsignada === 'string' ? o.etiquetaAreaAsignada : null,
    puedeElegirAreaEntrada: Boolean(o.puedeElegirAreaEntrada),
    restriccionTrasladoMismaAreaCatalogo: Boolean(o.restriccionTrasladoMismaAreaCatalogo),
    esAlmaceneroGeneral: Boolean(o.esAlmaceneroGeneral),
    sectoresVisibles: Array.isArray(o.sectoresVisibles)
      ? o.sectoresVisibles.filter((s): s is string => typeof s === 'string')
      : [],
    areasAlmacen: areas,
    destinosTraslado: destinos,
  };
}

export const AccesoAreaAlmacenService = {
  obtenerMiAcceso: async (): Promise<AccesoAreaAlmacen> => {
    const res = await apiClient.get<unknown>(RUTAS_INVENTARIO_CONTEXTO.MI_CONTEXTO);
    return normalizarAcceso(res.data);
  },

  listarAreasAlmacen: async (): Promise<UbicacionArea[]> => {
    const res = await apiClient.get<unknown[]>(RUTAS_INVENTARIO_CONTEXTO.AREAS_ALMACEN);
    return (res.data ?? []).map(normalizarUbicacion);
  },

  resumenAreasAlmacen: async (): Promise<ResumenStockArea[]> => {
    const res = await apiClient.get<unknown[]>(RUTAS_INVENTARIO_CONTEXTO.RESUMEN_AREAS);
    return (res.data ?? []).map((raw) => {
      const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      return {
        idUbicacionArea: num(o.idUbicacionArea, 0),
        etiqueta: typeof o.etiqueta === 'string' ? o.etiqueta : '',
        totalUnidades: num(o.totalUnidades, 0),
        variantesConStock: num(o.variantesConStock, 0),
      };
    });
  },
};
