import { describe, expect, it } from 'vitest';
import { aplicarMatrizAlVariantes } from './aplicarMatrizVariantes';

describe('aplicarMatrizAlVariantes', () => {
  const tallas = ['S', 'M'];
  const colores = ['NEGRO', 'ROJO'];

  it('no agrega variantes si todas las celdas están en 0', () => {
    const stocks = {
      S: { NEGRO: 0, ROJO: 0 },
      M: { NEGRO: 0, ROJO: 0 },
    };
    const result = aplicarMatrizAlVariantes([], tallas, colores, stocks, 'SKU-001');

    expect(result.celdasConStock).toBe(0);
    expect(result.combinacionesAplicadas).toBe(0);
    expect(result.variantes).toHaveLength(0);
  });

  it('crea combinaciones con cantidad > 0 (flujo matriz + Llenar todo)', () => {
    const stocks = {
      S: { NEGRO: 5, ROJO: 5 },
      M: { NEGRO: 5, ROJO: 5 },
    };
    const result = aplicarMatrizAlVariantes([], tallas, colores, stocks, 'SKU-001');

    expect(result.celdasConStock).toBe(4);
    expect(result.combinacionesAplicadas).toBe(4);
    expect(result.variantes).toHaveLength(4);
    expect(result.variantes[0]).toMatchObject({
      nombreTalla: 'S',
      nombreColor: 'NEGRO',
      cantidad: 5,
      stockAlmacen: 5,
      codigoIdentificacion: 'SKU-001-S-NEGRO',
    });
  });

  it('actualiza cantidad de variante existente', () => {
    const existente = [
      {
        id: 1,
        nombreTalla: 'S',
        nombreColor: 'NEGRO',
        cantidad: 2,
        stockAlmacen: 2,
        codigoIdentificacion: 'SKU-001-S-NEGRO',
      },
    ];
    const stocks = { S: { NEGRO: 10 } };
    const result = aplicarMatrizAlVariantes(existente, ['S'], ['NEGRO'], stocks, 'SKU-001');

    expect(result.variantes).toHaveLength(1);
    expect(result.variantes[0].cantidad).toBe(10);
    expect(result.variantes[0].id).toBe(1);
  });

  it('elimina variante si la celda pasa a 0', () => {
    const existente = [
      {
        nombreTalla: 'M',
        nombreColor: 'AZUL',
        cantidad: 3,
        codigoIdentificacion: 'X-M-AZUL',
      },
    ];
    const stocks = { M: { AZUL: 0 } };
    const result = aplicarMatrizAlVariantes(existente, ['M'], ['AZUL'], stocks, 'X');

    expect(result.variantes).toHaveLength(0);
    expect(result.combinacionesAplicadas).toBe(0);
  });

  it('usa PROD como código base si el producto aún no tiene código', () => {
    const stocks = { S: { ROJO: 1 } };
    const result = aplicarMatrizAlVariantes([], ['S'], ['ROJO'], stocks, '');

    expect(result.variantes[0].codigoIdentificacion).toBe('PROD-S-ROJO');
  });
});
