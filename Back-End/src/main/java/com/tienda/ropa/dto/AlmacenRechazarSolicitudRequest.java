package com.tienda.ropa.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Cuerpo para rechazar desde tablero almacén. Valores: SIN_STOCK_FISICO | PRENDA_DEFECTUOSA
 */
public record AlmacenRechazarSolicitudRequest(
        @NotBlank String motivo
) {}
