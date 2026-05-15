/**
 * Réplica de {@code Producto#validarPreciosPorVolumen} en el back-end:
 * divide totales entre 3, 6 y 12 con escala 2 y HALF_UP, y exige
 * precio unitario equivalente no creciente al aumentar el volumen.
 */
function divideHalfUp2(total: number, divisor: number): number {
  if (divisor === 0) return 0;
  const q = total / divisor;
  return Math.round(q * 100 + Number.EPSILON) / 100;
}

/**
 * @returns mensaje de error legible, o null si la jerarquía es válida.
 */
export function validarJerarquiaPreciosProducto(
  precioUnitario: number,
  precioCuarto: number,
  precioMediaDocena: number,
  precioDocena: number
): string | null {
  if (
    !Number.isFinite(precioUnitario) ||
    !Number.isFinite(precioCuarto) ||
    !Number.isFinite(precioMediaDocena) ||
    !Number.isFinite(precioDocena)
  ) {
    return 'Los precios deben ser números válidos.';
  }

  const precioUnitarioIndividual = precioUnitario;
  const precioUnitarioCuarto = divideHalfUp2(precioCuarto, 3);
  const precioUnitarioMediaDocena = divideHalfUp2(precioMediaDocena, 6);
  const precioUnitarioDocenaCompleta = divideHalfUp2(precioDocena, 12);

  if (precioUnitarioIndividual < precioUnitarioCuarto) {
    return (
      `El precio unitario del cuarto (S/.${precioUnitarioCuarto}) no puede ser mayor al precio individual (S/.${precioUnitarioIndividual})`
    );
  }
  if (precioUnitarioCuarto < precioUnitarioMediaDocena) {
    return (
      `El precio unitario de la media docena (S/.${precioUnitarioMediaDocena}) no puede ser mayor al precio unitario del cuarto (S/.${precioUnitarioCuarto})`
    );
  }
  if (precioUnitarioMediaDocena < precioUnitarioDocenaCompleta) {
    return (
      `El precio unitario de la docena (S/.${precioUnitarioDocenaCompleta}) no puede ser mayor al precio unitario de la media docena (S/.${precioUnitarioMediaDocena})`
    );
  }
  return null;
}
