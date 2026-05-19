package com.tienda.ropa.dto;

/**
 * Stock por variante en una {@code ubicacion_area}.
 */
public record StockUbicacionDTO(
        Long idVariante,
        Long idProducto,
        String nombreProducto,
        String codigoIdentificacion,
        String color,
        String talla,
        String sku,
        Integer stockActual,
        Long idUbicacionArea,
        String nombreUbicacion,
        String areaUbicacion
) {}
