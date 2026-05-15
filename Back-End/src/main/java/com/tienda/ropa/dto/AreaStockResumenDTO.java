package com.tienda.ropa.dto;

/**
 * Totales de inventario por área dentro de un piso (evita N consultas por ubicación).
 */
public record AreaStockResumenDTO(
        Long idUbicacion,
        String nombre,
        String area,
        String descripcion,
        Long totalUnidades,
        Long totalVariantesConStock
) {}
