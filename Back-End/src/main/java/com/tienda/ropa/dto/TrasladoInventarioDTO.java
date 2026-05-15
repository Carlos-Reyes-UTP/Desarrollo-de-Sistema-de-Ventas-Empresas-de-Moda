package com.tienda.ropa.dto;

/**
 * Solicitud de traslado inmediato de stock entre dos ubicaciones del almacén.
 * El servicio resta {@code cantidad} de la fila ({@code idVariante}, {@code idUbicacionOrigen})
 * y la suma a la fila destino dentro de la misma transacción.
 */
public record TrasladoInventarioDTO(
        Long idVariante,
        Long idUbicacionOrigen,
        Long idUbicacionDestino,
        Integer cantidad
) {}
