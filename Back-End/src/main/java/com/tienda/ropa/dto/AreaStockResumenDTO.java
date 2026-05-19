package com.tienda.ropa.dto;

/**
 * Totales de inventario por área dentro de un piso.
 */
public record AreaStockResumenDTO(
        Long idUbicacionArea,
        String nombre,
        String area,
        String descripcion,
        Long totalUnidades,
        Long totalVariantesConStock
) {}
