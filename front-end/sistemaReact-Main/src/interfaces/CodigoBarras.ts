export interface CodigoBarras {
  id?: number;
  codigo: string;
  formato: 'EAN8' | 'EAN13' | 'CODE128';
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidadId: number; // ID del producto o variante
  fechaCreacion?: Date;
  activo?: boolean;
}

export interface GenerarCodigoRequest {
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidadId: number;
  formato?: 'EAN8' | 'EAN13' | 'CODE128';
}

export interface AsignarCodigoRequest {
  codigo: string;
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidadId: number;
  formato: 'EAN8' | 'EAN13' | 'CODE128';
}

export interface BuscarPorCodigoResponse {
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidad: any; // Producto o ProductoVariante
  codigoBarras: CodigoBarras;
}

export type FormatoCodigoBarras = 'EAN8' | 'EAN13' | 'CODE128';
export type TipoCodigoBarras = 'PRODUCTO' | 'VARIANTE';
