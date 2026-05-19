package com.tienda.ropa.dto;

/**
 * Stock agregado en una ubicación-área de almacén (vista supervisor).
 */
public record ResumenStockAreaDTO(
        Long idUbicacionArea,
        String etiqueta,
        int totalUnidades,
        int variantesConStock
) {}
