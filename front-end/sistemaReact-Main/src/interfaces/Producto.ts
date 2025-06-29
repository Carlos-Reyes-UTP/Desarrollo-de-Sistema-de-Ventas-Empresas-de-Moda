import type { Categoria } from "./Categoria";
import type { Proveedor } from "./Proveedor";


export interface Producto {
  idProducto?: number;
  codigoIdentificacion: string;
  codigoBarras?: string; // Campo para código de barras
  cantidad: number;
  nombre: string;
  descripcion?: string;
  sexo?: string;
  categoria: Categoria; // En el payload de creación/actualización, podrías enviar solo el idCategoria
  categoriaPadre?: Categoria | null; // Similar, podrías enviar solo el idCategoriaPadre
  marca?: string;
  proveedor: Proveedor; // Similar, podrías enviar solo el idProveedor
  precioUnitario: number;
  precioCuarto?: number;
  precioMediaDocena?: number;
  precioDocena?: number;
  // Campos calculados/agregados
  cantidadTotal?: number; // Sum de todas las variantes
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

export interface ProductoVenta { // Producto tal como está en el carrito de venta
  idProducto: number;
  codigo: string;
  descripcion: string; // Usaremos producto.nombre para esto
  talla: string;
  cantidad: number;
  precio: number; // El precioUnitario aplicado (podría tener descuentos)
  total: number;
}