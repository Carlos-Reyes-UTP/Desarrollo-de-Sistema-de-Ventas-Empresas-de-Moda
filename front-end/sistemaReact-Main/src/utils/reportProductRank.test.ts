import { describe, expect, it } from 'vitest';
import {
  formatVarianteLabel,
  getBottomNByUnits,
  getTopNByUnits,
  orderByUnitsDesc,
} from './reportProductRank';

const sample = [
  { idProducto: 1, nombreProducto: 'A', cantidadVendida: 100, ingresosTotales: 500 },
  { idProducto: 2, nombreProducto: 'B', cantidadVendida: 10, ingresosTotales: 900 },
  { idProducto: 3, nombreProducto: 'C', cantidadVendida: 50, ingresosTotales: 200 },
  { idProducto: 4, nombreProducto: 'D', cantidadVendida: 5, ingresosTotales: 50 },
  { idProducto: 5, nombreProducto: 'E', cantidadVendida: 80, ingresosTotales: 400 },
  { idProducto: 6, nombreProducto: 'F', cantidadVendida: 20, ingresosTotales: 100 },
  { idProducto: 7, nombreProducto: 'G', cantidadVendida: 15, ingresosTotales: 75 },
  { idProducto: 8, nombreProducto: 'H', cantidadVendida: 8, ingresosTotales: 40 },
  { idProducto: 9, nombreProducto: 'I', cantidadVendida: 3, ingresosTotales: 30 },
  { idProducto: 10, nombreProducto: 'J', cantidadVendida: 60, ingresosTotales: 300 },
  { idProducto: 11, nombreProducto: 'K', cantidadVendida: 2, ingresosTotales: 20 },
];

describe('orderByUnitsDesc', () => {
  it('orders by units descending', () => {
    const ordered = orderByUnitsDesc(sample);
    expect(ordered[0].nombreProducto).toBe('A');
    expect(ordered[1].nombreProducto).toBe('E');
    expect(ordered[ordered.length - 1].nombreProducto).toBe('K');
  });

  it('breaks ties with ingresos', () => {
    const tied = [
      { idProducto: 1, nombreProducto: 'Low$', cantidadVendida: 10, ingresosTotales: 100 },
      { idProducto: 2, nombreProducto: 'High$', cantidadVendida: 10, ingresosTotales: 500 },
    ];
    expect(orderByUnitsDesc(tied)[0].nombreProducto).toBe('High$');
  });
});

describe('getTopNByUnits', () => {
  it('returns top 10 by default', () => {
    const top = getTopNByUnits(sample);
    expect(top).toHaveLength(10);
    expect(top[0].nombreProducto).toBe('A');
    expect(top.map((p) => p.nombreProducto)).not.toContain('K');
  });
});

describe('getBottomNByUnits', () => {
  it('returns empty when length <= n', () => {
    expect(getBottomNByUnits(sample.slice(0, 10))).toEqual([]);
    expect(getBottomNByUnits(sample.slice(0, 5), 10)).toEqual([]);
  });

  it('returns lowest rotation items when length > n', () => {
    const bottom = getBottomNByUnits(sample, 10);
    expect(bottom).toHaveLength(10);
    expect(bottom[0].nombreProducto).toBe('K');
    expect(bottom.map((p) => p.cantidadVendida)).toEqual(
      [...bottom.map((p) => p.cantidadVendida)].sort((a, b) => a - b)
    );
  });
});

describe('formatVarianteLabel', () => {
  it('joins product color and size', () => {
    expect(
      formatVarianteLabel({ nombreProducto: 'Polo', color: 'Negro', talla: 'M' })
    ).toBe('Polo · Negro · M');
  });
});
