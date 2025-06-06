import type { Producto } from './Producto';



export interface DetalleVenta extends Omit<DetalleVentaInput, 'producto'> {
  idDetalleVenta?: number;
  producto: Producto; // Al recibir, vendrá el objeto completo
  subtotal?: number;
}

export interface DetalleVentaInput { 
  producto: { idProducto: number }; 
  cantidad: number;
  precioUnitario: number; 
 
}