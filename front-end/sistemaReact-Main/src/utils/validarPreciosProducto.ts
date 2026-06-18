/**
 * Regla: el precio TOTAL debe bajar (o igualarse) al aumentar el volumen.
 * Ej: precioCuarto (3 u.) <= precioUnitario (1 u.),
 *     precioMediaDocena (6 u.) <= precioCuarto (3 u.),
 *     precioDocena (12 u.) <= precioMediaDocena (6 u.).
 */
export function validarJerarquiaPreciosProducto(
  precioUnitario: number,
  precioCuarto: number,
  precioMediaDocena: number,
  precioDocena: number
): string | null {
  if (!Number.isFinite(precioUnitario)) return null;

  if (Number.isFinite(precioCuarto) && precioCuarto > precioUnitario) {
    return `El precio del cuarto (S/.${precioCuarto}) no puede ser mayor al precio unitario (S/.${precioUnitario})`;
  }

  if (Number.isFinite(precioCuarto) && Number.isFinite(precioMediaDocena) && precioMediaDocena > precioCuarto) {
    return `El precio de la media docena (S/.${precioMediaDocena}) no puede ser mayor al precio del cuarto (S/.${precioCuarto})`;
  }

  if (Number.isFinite(precioMediaDocena) && Number.isFinite(precioDocena) && precioDocena > precioMediaDocena) {
    return `El precio de la docena (S/.${precioDocena}) no puede ser mayor al precio de la media docena (S/.${precioMediaDocena})`;
  }

  return null;
}
