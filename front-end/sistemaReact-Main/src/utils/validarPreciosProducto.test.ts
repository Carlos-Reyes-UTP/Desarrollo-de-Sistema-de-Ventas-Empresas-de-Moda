import { describe, expect, it } from 'vitest';
import { validarJerarquiaPreciosProducto } from './validarPreciosProducto';

describe('validarJerarquiaPreciosProducto', () => {
  it('acepta precios realistas: total cuarto mayor al unitario pero precio por prenda menor', () => {
    // Unitario 50, cuarto 120 → 40/prenda (válido en backend)
    expect(validarJerarquiaPreciosProducto(50, 120, 220, 400)).toBeNull();
  });

  it('rechaza cuando el precio unitario del cuarto supera al individual', () => {
    // Cuarto 180 → 60/prenda > 50 individual
    const err = validarJerarquiaPreciosProducto(50, 180, 300, 500);
    expect(err).toContain('cuarto');
    expect(err).toContain('50');
  });

  it('rechaza jerarquía incorrecta entre media docena y cuarto', () => {
    const err = validarJerarquiaPreciosProducto(10, 24, 200, 100);
    expect(err).toContain('media docena');
  });

  it('rechaza jerarquía incorrecta entre docena y media docena', () => {
    const err = validarJerarquiaPreciosProducto(10, 24, 36, 200);
    expect(err).toContain('docena');
  });

  it('acepta precios iguales por volumen (sin descuento)', () => {
    expect(validarJerarquiaPreciosProducto(10, 30, 60, 120)).toBeNull();
  });

  it('no valida si falta precio unitario', () => {
    expect(validarJerarquiaPreciosProducto(NaN, 120, 220, 400)).toBeNull();
  });

  /**
   * Caso que bloqueaba el formulario antes del arreglo:
   * totales 50 < 120 < 220 < 400 pero precio/prenda baja.
   */
  it('regresión: no usa comparación de montos totales (antigua regla incorrecta)', () => {
    const pu = 50;
    const pc = 120;
    expect(pc > pu).toBe(true);
    expect(validarJerarquiaPreciosProducto(pu, pc, 220, 400)).toBeNull();
  });
});
