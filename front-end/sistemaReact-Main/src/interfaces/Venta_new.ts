import type { Usuario } from "./Usuario";
import type { Cliente } from "./Cliente";
import type { MetodoPago } from "./MetodoPago";
import type { DetalleVenta, DetalleVentaInput } from "./DetalleVenta";

export interface VentaInput { // Para la creación de una venta
  // usuario se obtiene automáticamente del contexto de seguridad en el backend
  cliente: { idCliente: number }; // Solo el ID del cliente
  metodoPago: { idMetodoPago: number }; // Solo el ID del método de pago
  tipoComprobante: string;
  fechaVenta: string; // Formato ISO completo: YYYY-MM-DDTHH:mm:ss.sssZ
  detalles: DetalleVentaInput[];
  // TotalVentas se calcula en el backend
}

export interface Venta {
  idVenta?: number;
  usuario?: Usuario; // Opcional porque puede estar undefined en algunos casos
  cliente?: Cliente; // Opcional porque puede estar undefined en algunos casos
  metodoPago: MetodoPago;
  tipoComprobante: string;
  fechaVenta: string; // Formato ISO completo con fecha y hora: YYYY-MM-DDTHH:mm:ss.sssZ
  totalVentas: number;
  detalles: DetalleVenta[];
}
