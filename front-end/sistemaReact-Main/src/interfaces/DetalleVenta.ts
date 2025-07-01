import type { ProductoVariante } from './ProductoVariante';

export interface DetalleVenta extends Omit<DetalleVentaInput, 'productoVariante'> {
  idDetalleVenta?: number;
  productoVariante: ProductoVariante; // Al recibir, vendrá el objeto completo
  subtotal?: number;
}

export interface DetalleVentaInput { 
  productoVariante: { idProductoVariante: number }; 
  cantidad: number;
  precioUnitario: number; 
}