// Dashboard statistics interfaces for warehouse dashboard
export interface ProductoStats {
  total: number;
  bajoStock: number;
  sinStock: number;
  categorias: number;
  ultimoMes: number;
}

export interface CategoriaDistribucion {
  idCategoria: number;
  nombre: string;
  cantidadProductos: number;
  porcentaje: number;
}

export interface EstadoInventario {
  normal: number;
  bajo: number;
  critico: number;
  sinStock: number;
}

export interface ProductoInventario {
  idProducto: number;
  nombre: string;
  codigoIdentificacion: string;
  categoria: string;
  stock: number;
  estado: 'normal' | 'bajo' | 'critico' | 'sin-stock';
  fechaActualizacion?: string;
  precioUnitario: number;
  marca?: string;
  proveedor?: string;
}

export interface ActividadReciente {
  id: string;
  tipo: 'producto_actualizado' | 'producto_creado' | 'venta_realizada' | 'stock_bajo' | 'stock_critico';
  descripcion: string;
  detalles?: string;
  fecha: string;
  icono?: string;
}

export interface MovimientoInventario {
  idProducto: number;
  nombreProducto: string;
  tipoMovimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  fecha: string;
  motivo?: string;
  usuario?: string;
}
