import type { Producto } from "./Producto";
import type { Color } from "./Color";
import type { Talla } from "./Talla";

export type ProductoVariante = {
  idVariante?: number; // Campo para compatibilidad con el frontend
  idProductoVariante?: number; // Campo principal que viene del backend (real ID de BD)
  producto: Producto;
  nombre?: string;
  talla: Talla;
  color: Color;
  cantidad: number;
  stockAlmacen?: number;
  stockEnPiso?: number;
  codigoIdentificacion?: string; // Campo deprecated, usar codigoBarrasVariante
  codigoBarrasVariante?: string; // Campo correcto que corresponde con el backend
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}
