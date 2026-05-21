export interface VarianteMatrizForm {
  id?: number;
  nombreTalla: string;
  nombreColor: string;
  cantidad: number;
  stockAlmacen?: number;
  codigoIdentificacion: string;
}

export interface ResultadoAplicarMatriz {
  variantes: VarianteMatrizForm[];
  combinacionesAplicadas: number;
  celdasConStock: number;
}

/**
 * Aplica la cuadrícula talla×color al listado de variantes del formulario.
 * Solo registra combinaciones con cantidad > 0; las celdas en 0 eliminan la fila si existía.
 */
export function aplicarMatrizAlVariantes(
  variantesExistentes: VarianteMatrizForm[],
  tallasSeleccionadas: string[],
  coloresSeleccionados: string[],
  matrixStocks: Record<string, Record<string, number>>,
  codigoIdentificacionBase: string
): ResultadoAplicarMatriz {
  let celdasConStock = 0;
  for (const talla of tallasSeleccionadas) {
    for (const color of coloresSeleccionados) {
      if ((matrixStocks[talla]?.[color] ?? 0) > 0) {
        celdasConStock++;
      }
    }
  }

  const nuevasVariantes: VarianteMatrizForm[] = [...variantesExistentes];
  let combinacionesAplicadas = 0;
  const codigoBase = codigoIdentificacionBase.trim() || 'PROD';

  for (const talla of tallasSeleccionadas) {
    for (const color of coloresSeleccionados) {
      const cantidad = matrixStocks[talla]?.[color] ?? 0;
      const index = nuevasVariantes.findIndex(
        (v) =>
          v.nombreTalla.toUpperCase().trim() === talla &&
          v.nombreColor.toUpperCase().trim() === color
      );

      if (cantidad > 0) {
        combinacionesAplicadas++;
        if (index >= 0) {
          nuevasVariantes[index] = {
            ...nuevasVariantes[index],
            stockAlmacen: cantidad,
            cantidad,
          };
        } else {
          nuevasVariantes.push({
            nombreTalla: talla,
            nombreColor: color,
            cantidad,
            stockAlmacen: cantidad,
            codigoIdentificacion: `${codigoBase}-${talla}-${color}`,
          });
        }
      } else if (index >= 0) {
        nuevasVariantes.splice(index, 1);
      }
    }
  }

  return { variantes: nuevasVariantes, combinacionesAplicadas, celdasConStock };
}
