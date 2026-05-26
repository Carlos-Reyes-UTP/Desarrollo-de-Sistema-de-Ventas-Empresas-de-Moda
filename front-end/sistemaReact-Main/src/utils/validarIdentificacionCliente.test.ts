import { describe, expect, it } from 'vitest';
import {
  UMBRAL_DNI_OBLIGATORIO,
  esDocumentoReal,
  esDocumentoSintetico,
  evaluarIdentificacionCliente,
  generarDocumentoAnonimo,
  nombreCompletoValido,
} from './validarIdentificacionCliente';

describe('validarIdentificacionCliente', () => {
  it('genera documento anónimo con prefijo NN', () => {
    const doc = generarDocumentoAnonimo();
    expect(doc.startsWith('NN')).toBe(true);
    expect(doc.length).toBe(10);
    expect(esDocumentoSintetico(doc)).toBe(true);
    expect(esDocumentoReal(doc)).toBe(false);
  });

  it('acepta DNI y RUC reales', () => {
    expect(esDocumentoReal('12345678')).toBe(true);
    expect(esDocumentoReal('20123456789')).toBe(true);
  });

  it('venta menor a umbral: solo nombre (una palabra) sin documento', () => {
    const r = evaluarIdentificacionCliente({
      totalVenta: 50,
      tipoDocumento: 'DNI',
      documento: '',
      nombre: 'MARIA',
      clienteSeleccionado: null,
    });
    expect(r.valido).toBe(true);
    expect(r.requiereDocumento).toBe(false);
  });

  it('venta menor a umbral: rechaza si no hay nombre', () => {
    const r = evaluarIdentificacionCliente({
      totalVenta: 80,
      tipoDocumento: 'DNI',
      documento: '',
      nombre: '   ',
      clienteSeleccionado: null,
    });
    expect(r.valido).toBe(false);
    expect(r.mensaje).toContain('al menos un nombre');
  });

  it(`venta >= ${UMBRAL_DNI_OBLIGATORIO}: exige documento y nombre`, () => {
    const sinDoc = evaluarIdentificacionCliente({
      totalVenta: 100,
      tipoDocumento: 'DNI',
      documento: '',
      nombre: 'JUAN PEREZ',
      clienteSeleccionado: null,
    });
    expect(sinDoc.valido).toBe(false);
    expect(sinDoc.requiereDocumento).toBe(true);

    const conDoc = evaluarIdentificacionCliente({
      totalVenta: 150,
      tipoDocumento: 'DNI',
      documento: '87654321',
      nombre: 'JUAN PEREZ',
      clienteSeleccionado: null,
    });
    expect(conDoc.valido).toBe(true);
  });

  it('cliente seleccionado con documento real siempre válido', () => {
    const r = evaluarIdentificacionCliente({
      totalVenta: 200,
      tipoDocumento: 'DNI',
      documento: '',
      nombre: '',
      clienteSeleccionado: {
        numeroDocumento: '12345678',
        nombreCliente: 'CLIENTE BD',
      },
    });
    expect(r.valido).toBe(true);
  });

  it('nombreCompletoValido con dos palabras mínimo', () => {
    expect(nombreCompletoValido('ANA TORRES', true)).toBe(true);
    expect(nombreCompletoValido('ANA', true)).toBe(false);
    expect(nombreCompletoValido('ANA', false)).toBe(true);
  });
});
