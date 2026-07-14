import { describe, expect, it } from 'vitest';
import type { Venta } from '@/types/Venta';
import {
  formatDeltaPct,
  serieRitmoDiario,
  kpisDashboardMes,
  rankVariantesDesdeVentas,
  ultimasNVentas,
  etiquetaMetodoPago,
} from './dashboardMes';

function venta(partial: Partial<Venta> & { fechaVenta: string; totalVentas: number }): Venta {
  return {
    metodoPago: 'EFECTIVO',
    tipoComprobante: 'BOLETA',
    detalles: [],
    ...partial,
  } as Venta;
}

describe('formatDeltaPct', () => {
  it('returns null when compare is off', () => {
    expect(formatDeltaPct(12, false)).toBe(null);
  });
  it('returns null when pct is null (no base)', () => {
    expect(formatDeltaPct(null, true)).toBe(null);
  });
  it('formats signed percent when compare on', () => {
    expect(formatDeltaPct(8.2, true)).toMatch(/\+8/);
    expect(formatDeltaPct(-1.3, true)).toMatch(/−1|-/);
  });
});

describe('serieRitmoDiario', () => {
  it('builds one point per day from 1 to hoy and sums ventas', () => {
    const hoy = new Date(2026, 6, 13);
    const ventas = [
      venta({ fechaVenta: '2026-07-01T10:00:00', totalVentas: 100 }),
      venta({ fechaVenta: '2026-07-01T18:00:00', totalVentas: 50 }),
      venta({ fechaVenta: '2026-07-13T09:00:00', totalVentas: 20 }),
    ];
    const serie = serieRitmoDiario(ventas, { year: 2026, month: 7 }, hoy);
    expect(serie).toHaveLength(13);
    expect(serie[0].dia).toBe(1);
    expect(serie[0].actual).toBe(150);
    expect(serie[12].actual).toBe(20);
  });

  it('aligns mesAnterior by day index when provided', () => {
    const hoy = new Date(2026, 6, 5);
    const actual = [venta({ fechaVenta: '2026-07-02T10:00:00', totalVentas: 10 })];
    const ant = [
      venta({ fechaVenta: '2026-06-02T10:00:00', totalVentas: 40 }),
      venta({ fechaVenta: '2026-06-30T10:00:00', totalVentas: 99 }),
    ];
    const serie = serieRitmoDiario(actual, { year: 2026, month: 7 }, hoy, ant, {
      year: 2026,
      month: 6,
    });
    expect(serie[1].actual).toBe(10);
    expect(serie[1].anterior).toBe(40);
    expect(serie.every((p) => p.dia <= 5)).toBe(true);
  });
});

describe('kpisDashboardMes', () => {
  it('computes KPIs for current month range', () => {
    const hoy = new Date(2026, 6, 13);
    const ventas = [
      venta({
        fechaVenta: '2026-07-10T12:00:00',
        totalVentas: 100,
        cliente: { idCliente: 1 } as Venta['cliente'],
        detalles: [{ cantidad: 2, precioUnitario: 50, productoVariante: {} as never }],
      }),
    ];
    const k = kpisDashboardMes(ventas, { year: 2026, month: 7 }, hoy);
    expect(k.totalVentas).toBe(100);
    expect(k.productosVendidos).toBe(2);
    expect(k.clientesActivos).toBe(1);
    expect(k.ticketPromedio).toBe(100);
  });

  it('sets deltas null when compare off', () => {
    const hoy = new Date(2026, 6, 13);
    const ventas = [venta({ fechaVenta: '2026-07-10T12:00:00', totalVentas: 100 })];
    const off = kpisDashboardMes(ventas, { year: 2026, month: 7 }, hoy, false);
    expect(off.deltas).toBeNull();
  });
});

describe('rankVariantesDesdeVentas', () => {
  it('returns top and bottom by units', () => {
    const makeDet = (id: number, nombre: string, color: string, talla: string, qty: number) => ({
      cantidad: qty,
      precioUnitario: 10,
      productoVariante: {
        idProductoVariante: id,
        producto: { nombre },
        color: { nombre: color },
        talla: { nombreTalla: talla },
        cantidad: 0,
      },
    });
    const ventas = [
      venta({
        fechaVenta: '2026-07-05T10:00:00',
        totalVentas: 100,
        detalles: [
          makeDet(1, 'Polo', 'Azul', 'M', 40) as never,
          makeDet(2, 'Jean', 'Negro', '32', 30) as never,
          makeDet(3, 'Blusa', 'Rosa', 'S', 2) as never,
          makeDet(4, 'Short', 'Beige', 'L', 3) as never,
          makeDet(5, 'Casaca', 'Denim', 'L', 20) as never,
          makeDet(6, 'Gorra', 'Rojo', 'U', 5) as never,
        ],
      }),
    ];
    const { top, bottom } = rankVariantesDesdeVentas(ventas, 5);
    expect(top[0].unidades).toBe(40);
    expect(top[0].label).toContain('Polo');
    expect(bottom.length).toBeGreaterThan(0);
    expect(bottom[0].unidades).toBeLessThanOrEqual(bottom[bottom.length - 1].unidades);
  });
});

describe('ultimasNVentas', () => {
  it('returns newest N by fechaVenta desc', () => {
    const list = [
      venta({ idVenta: 1, fechaVenta: '2026-07-01T10:00:00', totalVentas: 1 }),
      venta({ idVenta: 2, fechaVenta: '2026-07-13T18:00:00', totalVentas: 2 }),
      venta({ idVenta: 3, fechaVenta: '2026-07-12T09:00:00', totalVentas: 3 }),
    ];
    const u = ultimasNVentas(list, 2);
    expect(u.map((v) => v.idVenta)).toEqual([2, 3]);
  });
});

describe('etiquetaMetodoPago', () => {
  it('handles string and object', () => {
    expect(etiquetaMetodoPago('YAPE')).toBe('YAPE');
    expect(etiquetaMetodoPago({ nombre: 'Tarjeta', tipo: 'TARJETA' })).toBe('Tarjeta');
  });
});
