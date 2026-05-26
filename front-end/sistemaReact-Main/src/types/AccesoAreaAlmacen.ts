import type { UbicacionArea } from './Almacen';

export interface AccesoAreaAlmacen {
  rolPrincipal: string | null;
  idUbicacionAreaAsignada: number | null;
  etiquetaAreaAsignada: string | null;
  puedeElegirAreaEntrada: boolean;
  restriccionTrasladoMismaAreaCatalogo: boolean;
  sectoresVisibles: string[];
  areasAlmacen: UbicacionArea[];
  destinosTraslado: UbicacionArea[];
}

export interface ResumenStockArea {
  idUbicacionArea: number;
  etiqueta: string;
  totalUnidades: number;
  variantesConStock: number;
}
