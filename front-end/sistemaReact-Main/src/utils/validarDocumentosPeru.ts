/**
 * Validaciones de documentos de identidad peruanos.
 *
 * - DNI: 8 dígitos numéricos (validación de formato).
 * - RUC: 11 dígitos numéricos con validación algorítmica Módulo 11 (SUNAT).
 *
 * El algoritmo de Módulo 11 valida el dígito verificador (último dígito del RUC)
 * y previene errores de digitación que pasen la simple validación de longitud.
 */

/** Factores del algoritmo Módulo 11 de SUNAT (se aplican desde la posición 0 al 9). */
const FACTORES_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Valida un número de RUC peruano usando el algoritmo Módulo 11 de SUNAT.
 *
 * Reglas:
 * 1. Exactamente 11 dígitos numéricos.
 * 2. Debe comenzar con 10, 15, 17 o 20 (personas naturales, pequeñas empresas, retenciones, personas jurídicas).
 * 3. El décimo primer dígito (dígito verificador) debe coincidir con el cálculo mod11.
 *
 * @param ruc - Cadena con el número de RUC a validar.
 * @returns `true` si el RUC es estructuralmente válido, `false` en caso contrario.
 */
export function validarRucMod11(ruc: string): boolean {
  // 1. Verificar longitud y que sean solo dígitos.
  if (!/^\d{11}$/.test(ruc)) return false;

  // 2. Verificar prefijos válidos en Perú.
  const prefijo = parseInt(ruc.substring(0, 2), 10);
  const prefijosValidos = [10, 15, 17, 20];
  if (!prefijosValidos.includes(prefijo)) return false;

  // 3. Cálculo del dígito verificador (Módulo 11).
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(ruc[i], 10) * FACTORES_RUC[i];
  }

  const resto = suma % 11;
  let digitoVerificador = 11 - resto;

  // Ajustes especiales definidos por SUNAT.
  if (digitoVerificador === 10) digitoVerificador = 0;
  if (digitoVerificador === 11) digitoVerificador = 1;

  return digitoVerificador === parseInt(ruc[10], 10);
}

/**
 * Valida un número de DNI peruano (solo validación de formato).
 * @param dni - Cadena con el número de DNI a validar.
 * @returns `true` si el DNI tiene 8 dígitos numéricos.
 */
export function validarDni(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

/**
 * Retorna un mensaje de error descriptivo para un RUC inválido, o `null` si es válido.
 * @param ruc - Cadena con el número de RUC a validar.
 */
export function mensajeErrorRuc(ruc: string): string | null {
  const trimmed = ruc.trim();
  if (!trimmed) return 'El RUC es requerido.';
  if (!/^\d+$/.test(trimmed)) return 'El RUC debe contener solo dígitos numéricos.';
  if (trimmed.length !== 11) return `El RUC debe tener 11 dígitos (actualmente tiene ${trimmed.length}).`;
  const prefijo = parseInt(trimmed.substring(0, 2), 10);
  if (![10, 15, 17, 20].includes(prefijo)) {
    return `El RUC debe comenzar con 10, 15, 17 o 20 (prefijo actual: ${prefijo}).`;
  }
  if (!validarRucMod11(trimmed)) {
    return 'El RUC no es válido. Verifique el número ingresado (dígito verificador incorrecto).';
  }
  return null;
}
