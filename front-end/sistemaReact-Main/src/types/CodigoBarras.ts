export interface CodigoBarras {
  id?: number;
  codigo: string;
  formato: 'EAN8' | 'EAN13' | 'CODE128';
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidadId: number; // ID del producto o variante
  fechaCreacion?: Date;
  activo?: boolean;
}

// Nueva interfaz para optimización (evitar problema N+1)
export interface CodigoBarrasConDetallesDTO {
  // Información del código de barras
  id: number;
  codigo: string;
  formato: 'EAN8' | 'EAN13' | 'CODE128';
  tipo: 'PRODUCTO' | 'VARIANTE';
  entidadId: number;
  fechaCreacion: Date;
  activo: boolean;
  
  // Información del producto (siempre presente)
  producto: {
    idProducto: number;
    codigoIdentificacion: string;
    nombre: string;
    descripcion?: string;
    marca?: string;
    sexo?: string;
  };
  
  // Información de la variante (solo si tipo === 'VARIANTE')
  variante?: {
    idVariante: number;
    codigoBarrasVariante: string;
    cantidad: number;
    talla: {
      idTalla: number;
      nombreTalla: string;
    };
    color: {
      idColor: number;
      nombre: string;
      codigoHex: string;
    };
  };
  
  // Información de la categoría
  categoria: {
    idCategoria: number;
    nombre: string;
  };
  
  // Información del proveedor
  proveedor: {
    idProveedor: number;
    nombre: string;
  };
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
