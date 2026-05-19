/** IDs de métodos de pago — deben coincidir con la tabla `metodo_pago` del backend */
export const METODO_PAGO_ID = {
  EFECTIVO: 1,
  TARJETA: 2,
  YAPE: 3,
  PLIN: 4,
} as const;

export type MetodoPagoKey = keyof typeof METODO_PAGO_ID;

/** Métodos de pago que requieren mostrar QR antes de confirmar */
export const METODOS_PAGO_QR: string[] = ['yape', 'plin'];
