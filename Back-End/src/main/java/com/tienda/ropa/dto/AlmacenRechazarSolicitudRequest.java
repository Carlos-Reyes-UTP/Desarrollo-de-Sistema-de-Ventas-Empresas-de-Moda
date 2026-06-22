package com.tienda.ropa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo para rechazar desde tablero almacén. Valores: SIN_STOCK_FISICO | PRENDA_DEFECTUOSA | OTRO
 */
public record AlmacenRechazarSolicitudRequest(
        @NotBlank String motivo,
        @Size(max = 200) String comentario
) {}
