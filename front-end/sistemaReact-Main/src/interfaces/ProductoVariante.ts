import type { Producto } from "./Producto";
import type { Color } from "./Color";
import type { Talla } from "./Talla";

export interface ProductoVariante {
  idVariante?: number;
  producto: Producto;
  talla: Talla;
  color: Color;
  cantidad: number;
  codigoIdentificacion: string;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}
