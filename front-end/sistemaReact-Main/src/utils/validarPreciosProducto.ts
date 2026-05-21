/** Redondeo HALF_UP como BigDecimal en el backend (2 decimales). */
function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Misma regla que Producto.validarPreciosPorVolumen() en el backend:
 * el precio por prenda debe bajar (o igualarse) al aumentar el volumen.
 * Los montos totales del cuarto/docena pueden ser mayores al unitario.
 */
export function validarJerarquiaPreciosProducto(
  precioUnitario: number,
  precioCuarto: number,
  precioMediaDocena: number,
  precioDocena: number
): string | null {
  if (!Number.isFinite(precioUnitario)) return null;

  if (Number.isFinite(precioCuarto)) {
    const unitCuarto = redondear2(precioCuarto / 3);
    if (precioUnitario < unitCuarto) {
      return `El precio unitario del cuarto (S/.${unitCuarto}) no puede ser mayor al precio individual (S/.${precioUnitario})`;
    }
  }

  if (Number.isFinite(precioCuarto) && Number.isFinite(precioMediaDocena)) {
    const unitCuarto = redondear2(precioCuarto / 3);
    const unitMedia = redondear2(precioMediaDocena / 6);
    if (unitCuarto < unitMedia) {
      return `El precio unitario de la media docena (S/.${unitMedia}) no puede ser mayor al precio unitario del cuarto (S/.${unitCuarto})`;
    }
  }

  if (Number.isFinite(precioMediaDocena) && Number.isFinite(precioDocena)) {
    const unitMedia = redondear2(precioMediaDocena / 6);
    const unitDocena = redondear2(precioDocena / 12);
    if (unitMedia < unitDocena) {
      return `El precio unitario de la docena (S/.${unitDocena}) no puede ser mayor al precio unitario de la media docena (S/.${unitMedia})`;
    }
  }

  return null;
}
