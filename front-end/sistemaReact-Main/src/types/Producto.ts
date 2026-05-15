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
  tipoPublico: string; // NUEVO: niño o adulto - no puede ser nulo
  categoria?: Categoria; // Ahora es opcional - se usa para subcategorías
  subCategoria2: Categoria; // NUEVO: subcategoría adicional - no puede ser nulo
  categoriaPadre?: Categoria | null; // Se usa para categorías principales
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
  idProductoVariante: number; // Ahora usamos el ID de la variante
  idProducto: number; // Mantenemos el ID del producto para referencia
  codigo: string;
  descripcion: string; // Usaremos producto.nombre para esto
  talla: string; // Ahora tendrá la talla real de la variante
  color: string; // Añadimos el color de la variante
  tipoPublico?: string; // Tipo de público del producto (niño/adulto)
  cantidad: number;
  precio: number; // El precioUnitario aplicado (podría tener descuentos)
  total: number;
}