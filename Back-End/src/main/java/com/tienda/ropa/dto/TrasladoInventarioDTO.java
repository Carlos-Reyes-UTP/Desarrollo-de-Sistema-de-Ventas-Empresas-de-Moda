package com.tienda.ropa.dto;

/**
 * Traslado inmediato de stock entre dos {@code ubicacion_area}.
 */
public record TrasladoInventarioDTO(
        Long idVariante,
        Long idUbicacionAreaOrigen,
        Long idUbicacionAreaDestino,
        Integer cantidad
) {}
