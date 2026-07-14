import { describe, expect, it } from 'vitest';
import type { Venta } from '@/types/Venta';
import {
  compararMeses,
  etiquetaMesCorto,
  mesAnteriorA,
  mesEsFuturo,
  mesRefFromKey,
  mesRefToKey,
  mismoMes,
  pctCrecimientoComparar,
  rangoMesCalendario,
} from './reportesCompararMeses';

function venta(fecha: string, total: number, idCliente?: number): Venta {
  return {
    fechaVenta: fecha,
    totalVentas: total,
    metodoPago: 'EFECTIVO',
    tipoComprobante: 'BOLETA',
    detalles: [],
    cliente: idCliente !== undefined ? ({ idCliente } as Venta['cliente']) : undefined,
  };
}

describe('reportesCompararMeses', () => {
  it('rangoMesCalendario cubre el mes completo en meses pasados', () => {
    const { inicio, fin } = rangoMesCalendario({ year: 2026, month: 5 }, new Date(2026, 6, 13));
    expect(inicio.getFullYear()).toBe(2026);
    expect(inicio.getMonth()).toBe(4);
    expect(inicio.getDate()).toBe(1);
    expect(fin.getMonth()).toBe(4);
    expect(fin.getDate()).toBe(31);
  });

  it('rangoMesCalendario del mes actual corta en fin de hoy', () => {
    const hoy = new Date(2026, 6, 13, 10, 0, 0);
    const { inicio, fin } = rangoMesCalendario({ year: 2026, month: 7 }, hoy);
    expect(inicio.getDate()).toBe(1);
    expect(fin.getDate()).toBe(13);
    expect(fin.getHours()).toBe(23);
  });

  it('pctCrecimientoComparar: bordes 0/0, 0/>0 y normal', () => {
    expect(pctCrecimientoComparar(0, 0)).toBe(0);
    expect(pctCrecimientoComparar(50, 0)).toBe(100);
    expect(pctCrecimientoComparar(120, 100)).toBeCloseTo(20);
    expect(pctCrecimientoComparar(80, 100)).toBeCloseTo(-20);
  });

  it('mesAnteriorA y mismoMes', () => {
    expect(mesAnteriorA({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
    expect(mismoMes({ year: 2026, month: 7 }, { year: 2026, month: 7 })).toBe(true);
    expect(mismoMes({ year: 2026, month: 7 }, { year: 2026, month: 6 })).toBe(false);
  });

  it('mesEsFuturo bloquea meses posteriores', () => {
    const hoy = new Date(2026, 6, 13);
    expect(mesEsFuturo({ year: 2026, month: 8 }, hoy)).toBe(true);
    expect(mesEsFuturo({ year: 2026, month: 7 }, hoy)).toBe(false);
  });

  it('mesRefToKey / mesRefFromKey roundtrip', () => {
    expect(mesRefToKey({ year: 2026, month: 3 })).toBe('2026-03');
    expect(mesRefFromKey('2026-03')).toEqual({ year: 2026, month: 3 });
    expect(mesRefFromKey('bad')).toBeNull();
  });

  it('etiquetaMesCorto en español corto', () => {
    expect(etiquetaMesCorto({ year: 2026, month: 6 })).toBe('jun 2026');
  });

  it('compararMeses calcula deltas y serie; mismo mes es inválido', () => {
    const hoy = new Date(2026, 6, 20);
    const ventas: Venta[] = [
      venta('2026-06-10T12:00:00', 100, 1),
      venta('2026-06-15T12:00:00', 100, 2),
      venta('2026-07-05T12:00:00', 300, 1),
    ];

    const same = compararMeses(
      ventas,
      { year: 2026, month: 7 },
      { year: 2026, month: 7 },
      hoy
    );
    expect(same.invalidSameMonth).toBe(true);
    expect(same.chartSerie).toHaveLength(0);

    const res = compararMeses(
      ventas,
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      hoy
    );
    expect(res.invalidSameMonth).toBe(false);
    expect(res.base.totalVentas).toBe(200);
    expect(res.comparar.totalVentas).toBe(300);
    expect(res.deltas.crecimientoVentas).toBeCloseTo(50);
    expect(res.deltas.crecimientoProductos).toBeDefined();
    expect(typeof res.deltas.crecimientoProductos).toBe('number');
    expect(res.chartSerie).toHaveLength(3);
    expect(res.chartSerie[0].metrica).toBe('Ingresos');
    expect(res.chartSerie[0].comparar).toBe(100);
    expect(res.chartSerie[0].base).toBeCloseTo((200 / 300) * 100);
    expect(res.insight.toLowerCase()).toContain('ingresos');
  });
});
