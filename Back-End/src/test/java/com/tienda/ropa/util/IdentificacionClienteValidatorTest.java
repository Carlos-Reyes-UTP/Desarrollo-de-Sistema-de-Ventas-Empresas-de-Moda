package com.tienda.ropa.util;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import com.tienda.ropa.entity.Cliente;

class IdentificacionClienteValidatorTest {

    @Test
    void testEsDocumentoSintetico() {
        assertTrue(IdentificacionClienteValidator.esDocumentoSintetico("NN00000001"));
        assertFalse(IdentificacionClienteValidator.esDocumentoSintetico("45678912"));
        assertFalse(IdentificacionClienteValidator.esDocumentoSintetico("NN123"));
        assertFalse(IdentificacionClienteValidator.esDocumentoSintetico(null));
    }

    @Test
    void testEsDniValido() {
        assertTrue(IdentificacionClienteValidator.esDniValido("12345678"));
        assertFalse(IdentificacionClienteValidator.esDniValido("1234567"));
        assertFalse(IdentificacionClienteValidator.esDniValido("123456789"));
        assertFalse(IdentificacionClienteValidator.esDniValido("abc56789"));
        assertFalse(IdentificacionClienteValidator.esDniValido(null));
    }

    @Test
    void testEsRucValido() {
        assertTrue(IdentificacionClienteValidator.esRucValido("10456789123"));
        assertFalse(IdentificacionClienteValidator.esRucValido("1045678912"));
        assertFalse(IdentificacionClienteValidator.esRucValido("104567891234"));
        assertFalse(IdentificacionClienteValidator.esRucValido("abc45678912"));
        assertFalse(IdentificacionClienteValidator.esRucValido(null));
    }

    @Test
    void testEsDocumentoReal() {
        assertTrue(IdentificacionClienteValidator.esDocumentoReal("12345678"));
        assertTrue(IdentificacionClienteValidator.esDocumentoReal("10456789123"));
        assertFalse(IdentificacionClienteValidator.esDocumentoReal("NN00000001"));
        assertFalse(IdentificacionClienteValidator.esDocumentoReal(null));
    }

    @Test
    void testValidarClienteParaVentaMontoUmbral() {
        Cliente clienteNN = new Cliente();
        clienteNN.setNumeroDocumento("NN00000001");

        // Monto menor a S/ 100.00 no debe arrojar error
        assertDoesNotThrow(() -> 
            IdentificacionClienteValidator.validarClienteParaVenta(clienteNN, new BigDecimal("99.99"))
        );

        // Monto exactamente S/ 100.00 debe arrojar IllegalArgumentException
        Exception exception = assertThrows(IllegalArgumentException.class, () -> 
            IdentificacionClienteValidator.validarClienteParaVenta(clienteNN, new BigDecimal("100.00"))
        );
        
        assertEquals("Para ventas desde S/ 100.00 se requiere DNI (8 dígitos) o RUC (11 dígitos) válido del cliente.", exception.getMessage());
    }
}