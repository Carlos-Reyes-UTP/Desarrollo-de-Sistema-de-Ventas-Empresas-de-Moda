import type { Usuario } from "./Usuario";
import type { Cliente } from "./Cliente";
import type { MetodoPago } from "./MetodoPago";
import type { DetalleVenta } from "./DetalleVenta";
import type { DetalleVentaInput } from "./DetalleVenta";

export interface VentaInput { // Para la creación de una venta
  // usuario se obtiene automáticamente del contexto de seguridad en el backend
  cliente: { idCliente: number }; // Solo el ID del cliente
  metodoPago: { idMetodoPago: number }; // Solo el ID del método de pago
  tipoComprobante: string;
  fechaVenta: string; // Formato YYYY-MM-DD
  detalles: DetalleVentaInput[];
  // TotalVentas se calcula en el backend
}

export interface Venta {
  idVenta?: number;
  usuario: Usuario;
  cliente: Cliente;
  metodoPago: MetodoPago;
  tipoComprobante: string;
  fechaVenta: string; // Formato YYYY-MM-DD
  totalVentas: number;
  detalles: DetalleVenta[];
}
