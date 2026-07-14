import { describe, expect, it } from 'vitest';
import {
  mapScoreToSignalTone,
  signalLabel,
  buildSignalFromScore,
  buildSignalFromCompareDeltas,
} from './reportSignal';

describe('mapScoreToSignalTone', () => {
  it('maps high score to up', () => {
    expect(mapScoreToSignalTone(75)).toBe('up');
    expect(mapScoreToSignalTone(90)).toBe('up');
  });
  it('maps low score to down', () => {
    expect(mapScoreToSignalTone(44)).toBe('down');
    expect(mapScoreToSignalTone(0)).toBe('down');
  });
  it('maps mid score to mixed', () => {
    expect(mapScoreToSignalTone(45)).toBe('mixed');
    expect(mapScoreToSignalTone(74)).toBe('mixed');
  });
});

describe('signalLabel', () => {
  it('returns Malo Bueno Excelente', () => {
    expect(signalLabel('up')).toBe('Excelente');
    expect(signalLabel('mixed')).toBe('Bueno');
    expect(signalLabel('down')).toBe('Malo');
  });
});

describe('buildSignalFromCompareDeltas', () => {
  it('up when ingresos and ventas positive', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 12,
      crecimientoOrdenes: 8,
      crecimientoTicket: -3,
      etiquetaBase: 'Jun 2026',
      etiquetaComparar: 'Jul 2026',
    });
    expect(s.tone).toBe('up');
    expect(s.label).toBe('Excelente');
    expect(s.contextLabel).toBe('Jul 2026 vs Jun 2026');
    expect(s.leadDelta).toEqual({ label: 'Ingresos', pct: 12 });
    expect(s.summary).toMatch(/dinero subió 12\.0%/);
    expect(s.basisTitle).toBe('¿Por qué esta lectura?');
    expect(s.basisLead).toMatch(/Excelente/);
    expect(s.basisItems.some((i) => i.label === 'Dinero' && /subió/.test(i.detail))).toBe(true);
  });
  it('up when ingresos positive and ordenes flat at zero', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 5,
      crecimientoOrdenes: 0,
      crecimientoTicket: 1,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('up');
  });
  it('down when ingresos and ventas negative', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: -10,
      crecimientoOrdenes: -5,
      crecimientoTicket: 2,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('down');
    expect(s.label).toBe('Malo');
    expect(s.basisItems[0].detail).toMatch(/Malo/);
  });
  it('mixed when signs disagree', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 10,
      crecimientoOrdenes: -8,
      crecimientoTicket: 0,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('mixed');
    expect(s.label).toBe('Bueno');
    expect(s.summary).toMatch(/menos ventas/);
    expect(s.basisItems[0].label).toBe('Lectura');
    expect(s.basisItems[0].detail).toMatch(/Bueno/);
  });
  it('mixed when ingresos flat and ordenes move', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 0,
      crecimientoOrdenes: 10,
      crecimientoTicket: -2,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('mixed');
    expect(s.label).toBe('Bueno');
  });
  it('explains strong drop in plain language', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: -67.3,
      crecimientoOrdenes: -1.7,
      crecimientoTicket: -66.8,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('down');
    expect(s.basisItems.find((i) => i.label === 'Dinero')?.detail).toMatch(/bajó con fuerza/);
    expect(s.basisItems.find((i) => i.label === 'Ticket')?.detail).toMatch(/Promedio por cada venta/);
  });
});

describe('buildSignalFromScore', () => {
  it('builds plain language summary and basis', () => {
    const s = buildSignalFromScore({
      score: 80,
      headline: 'Salud comercial sólida',
      crecimientoVentas: 12.4,
      crecimientoOrdenes: 8,
      crecimientoTicket: -3.2,
      leadDeltaPct: 12.4,
      leadDeltaLabel: 'Ingresos',
    });
    expect(s.tone).toBe('up');
    expect(s.label).toBe('Excelente');
    expect(s.leadDelta?.pct).toBe(12.4);
    expect(s.summary).toMatch(/va bien/);
    expect(s.basisTitle).toBe('¿Por qué esta lectura?');
    expect(s.basisItems[0].label).toBe('Lectura');
    expect(s.basisItems[0].detail).toMatch(/Excelente/);
    expect(s.basisItems.find((i) => i.label === 'Dinero')?.detail).toMatch(/12\.4%/);
  });
  it('without leadDeltaLabel uses ingresos from deltas', () => {
    const s = buildSignalFromScore({
      score: 80,
      crecimientoVentas: 12.4,
      crecimientoOrdenes: 5,
      crecimientoTicket: 1,
      leadDeltaPct: 12.4,
    });
    expect(s.leadDelta).toEqual({ label: 'Ingresos', pct: 12.4 });
  });
  it('score 40 → Malo', () => {
    const s = buildSignalFromScore({
      score: 40,
      headline: 'Alerta comercial',
      summary: 'Requiere atención.',
    });
    expect(s.tone).toBe('down');
    expect(s.label).toBe('Malo');
    expect(s.summary).toBe('Requiere atención.');
    expect(s.basisItems[0].detail).toMatch(/40 de 100/);
  });
  it('mid score with opposing deltas → Bueno', () => {
    const s = buildSignalFromScore({
      score: 62,
      crecimientoVentas: 12,
      crecimientoOrdenes: 8,
      crecimientoTicket: -3.2,
    });
    expect(s.tone).toBe('mixed');
    expect(s.label).toBe('Bueno');
    expect(s.summary).toMatch(/deja menos|ticket/i);
    expect(s.basisItems.find((i) => i.label === 'Ticket')?.detail).toMatch(/-3\.2%/);
  });
});
