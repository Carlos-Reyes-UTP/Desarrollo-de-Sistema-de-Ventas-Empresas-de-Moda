/** Umbral en soles (inclusive): total >= umbral exige DNI/RUC real. */
export const UMBRAL_DNI_OBLIGATORIO = 100;

/** Prefijo de documentos internos para ventas sin DNI/RUC. */
export const PREFIJO_DOCUMENTO_ANONIMO = 'NN';

export function esDocumentoSintetico(numeroDocumento: string): boolean {
  return (
    numeroDocumento.startsWith(PREFIJO_DOCUMENTO_ANONIMO) &&
    numeroDocumento.length === 10
  );
}

export function esDniValido(documento: string): boolean {
  return documento.length === 8 && /^\d+$/.test(documento);
}

import { validarRucMod11 } from './validarDocumentosPeru';

export function esRucValido(documento: string): boolean {
  return documento.length === 11 && /^\d+$/.test(documento);
}

export function esRucValidoMod11(documento: string): boolean {
  return esRucValido(documento) && validarRucMod11(documento);
}

export function esDocumentoReal(numeroDocumento: string): boolean {
  if (!numeroDocumento || esDocumentoSintetico(numeroDocumento)) return false;
  return esDniValido(numeroDocumento) || esRucValido(numeroDocumento);
}

export function nombreCompletoValido(
  nombre: string,
  requiereDosPalabras: boolean
): boolean {
  const trimmed = nombre.trim();
  if (!trimmed) return false;
  if (!requiereDosPalabras) return true;
  return trimmed.split(/\s+/).length >= 2;
}

/** Documento único de 10 caracteres (no confundible con DNI/RUC peruano). */
export function generarDocumentoAnonimo(): string {
  const suffix = String(Date.now()).slice(-8);
  return `${PREFIJO_DOCUMENTO_ANONIMO}${suffix}`;
}

export interface EvaluarIdentificacionInput {
  totalVenta: number;
  tipoDocumento: 'DNI' | 'RUC';
  documento: string;
  nombre: string;
  clienteSeleccionado: {
    numeroDocumento: string;
    nombreCliente: string;
  } | null;
  metodoPago?: string;
}

export interface EvaluarIdentificacionResult {
  valido: boolean;
  requiereDocumento: boolean;
  docValido: boolean;
  mensaje: string | null;
}

export function evaluarIdentificacionCliente(
  input: EvaluarIdentificacionInput
): EvaluarIdentificacionResult {
  const { totalVenta, tipoDocumento, documento, nombre, clienteSeleccionado, metodoPago } =
    input;
  const requiereDocumento = totalVenta >= UMBRAL_DNI_OBLIGATORIO && metodoPago === 'tarjeta';
  const docTrim = documento.trim();

  const docValidoForm =
    (tipoDocumento === 'DNI' && esDniValido(docTrim)) ||
    (tipoDocumento === 'RUC' && esRucValido(docTrim));

  if (clienteSeleccionado) {
    const docSel = clienteSeleccionado.numeroDocumento;
    if (esDocumentoReal(docSel)) {
      return { valido: true, requiereDocumento, docValido: true, mensaje: null };
    }
    if (
      !requiereDocumento &&
      nombreCompletoValido(
        nombre || clienteSeleccionado.nombreCliente,
        false
      )
    ) {
      return { valido: true, requiereDocumento, docValido: false, mensaje: null };
    }
    return {
      valido: false,
      requiereDocumento,
      docValido: false,
      mensaje: requiereDocumento
        ? 'Complete los datos del cliente.'
        : 'Ingrese al menos un nombre del cliente.',
    };
  }

  const nombreParaValidar = nombre.trim();

  if (requiereDocumento) {
    const ok =
      docValidoForm && nombreCompletoValido(nombreParaValidar, false);
    return {
      valido: ok,
      requiereDocumento,
      docValido: docValidoForm,
      mensaje: ok ? null : 'Complete los datos del cliente.',
    };
  }

  if (docValidoForm) {
    const ok = nombreCompletoValido(nombreParaValidar, false);
    return {
      valido: ok,
      requiereDocumento,
      docValido: true,
      mensaje: ok ? null : 'Ingrese el nombre del cliente.',
    };
  }

  const ok = nombreCompletoValido(nombreParaValidar, false);
  return {
    valido: ok,
    requiereDocumento,
    docValido: false,
    mensaje: ok
      ? null
      : 'Ingrese al menos un nombre del cliente.',
  };
}
