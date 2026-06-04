package com.tienda.ropa.dto;

public record AlertaReposicionDTO(
        Long idVariante,
        Long idProducto,
        String nombreProducto,
        String color,
        String talla,
        String sku,
        String ubicacionPiso,
        String area,
        int stockActual,
        int stockObjetivo,
        int cantidadSugerida,
        boolean tieneSolicitudPendiente,
        Long idUbicacionArea
) {}