package com.tienda.ropa.util;

import java.math.BigDecimal;

import com.tienda.ropa.entity.Cliente;

/**
 * Reglas de identificación del cliente en POS según monto de venta.
 * Total &gt;= 100 soles: DNI (8 dígitos) o RUC (11 dígitos) real obligatorio.
 */
public final class IdentificacionClienteValidator {

    public static final BigDecimal UMBRAL_DNI_OBLIGATORIO = new BigDecimal("100.00");
    public static final String PREFIJO_DOCUMENTO_ANONIMO = "NN";

    private IdentificacionClienteValidator() {
    }

    public static boolean esDocumentoSintetico(String numeroDocumento) {
        return numeroDocumento != null
                && numeroDocumento.startsWith(PREFIJO_DOCUMENTO_ANONIMO)
                && numeroDocumento.length() == 10;
    }

    public static boolean esDniValido(String documento) {
        return documento != null
                && documento.length() == 8
                && documento.matches("\\d+");
    }

    public static boolean esRucValido(String documento) {
        return documento != null
                && documento.length() == 11
                && documento.matches("\\d+");
    }

    public static boolean esDocumentoReal(String numeroDocumento) {
        if (numeroDocumento == null || esDocumentoSintetico(numeroDocumento)) {
            return false;
        }
        return esDniValido(numeroDocumento) || esRucValido(numeroDocumento);
    }

    /**
     * Valida que el cliente cumpla la regla de documento cuando el total de venta
     * alcanza o supera el umbral.
     */
    public static void validarClienteParaVenta(Cliente cliente, BigDecimal totalVenta) {
        if (totalVenta == null || totalVenta.compareTo(UMBRAL_DNI_OBLIGATORIO) < 0) {
            return;
        }
        String doc = cliente != null ? cliente.getNumeroDocumento() : null;
        if (!esDocumentoReal(doc)) {
            throw new IllegalArgumentException(
                    "Para ventas desde S/ 100.00 se requiere DNI (8 dígitos) o RUC (11 dígitos) válido del cliente.");
        }
    }
}
