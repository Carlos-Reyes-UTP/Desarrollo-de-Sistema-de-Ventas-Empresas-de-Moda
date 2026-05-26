import type { ProductoVariante } from './ProductoVariante';

export interface DetalleVenta extends Omit<DetalleVentaInput, 'productoVariante'> {
  idDetalleVenta?: number;
  productoVariante: ProductoVariante;
  subtotal?: number;
  origenVenta?: 'PISO' | 'ALMACEN_DIRECTO';
}

export interface DetalleVentaInput { 
  productoVariante: { idProductoVariante: number }; 
  cantidad: number;
  precioUnitario: number; 
}