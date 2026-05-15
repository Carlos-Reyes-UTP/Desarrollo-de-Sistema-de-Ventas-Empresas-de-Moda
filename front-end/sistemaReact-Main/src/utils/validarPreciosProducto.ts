export function validarJerarquiaPreciosProducto(
  precioUnitario: number,
  precioCuarto: number,
  precioMediaDocena: number,
  precioDocena: number
): string | null {
  if (!Number.isFinite(precioUnitario)) return null;
  if (Number.isFinite(precioCuarto) && precioCuarto > precioUnitario) {
    return `El precio por cuarto (S/.${precioCuarto}) no puede ser mayor al precio unitario (S/.${precioUnitario})`;
  }
  if (Number.isFinite(precioCuarto) && Number.isFinite(precioMediaDocena) && precioMediaDocena > precioCuarto) {
    return `El precio por media docena (S/.${precioMediaDocena}) no puede ser mayor al precio por cuarto (S/.${precioCuarto})`;
  }
  if (Number.isFinite(precioMediaDocena) && Number.isFinite(precioDocena) && precioDocena > precioMediaDocena) {
    return `El precio por docena (S/.${precioDocena}) no puede ser mayor al precio por media docena (S/.${precioMediaDocena})`;
  }
  return null;
}
