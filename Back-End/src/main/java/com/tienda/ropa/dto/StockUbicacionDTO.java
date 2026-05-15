package com.tienda.ropa.dto;

/**
 * Fila plana de stock por variante en una ubicación, pensada para el modal de
 * traslado: incluye lo necesario para mostrar el producto y limitar la cantidad.
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
        Long idUbicacion,
        String nombreUbicacion,
        String areaUbicacion
) {}
