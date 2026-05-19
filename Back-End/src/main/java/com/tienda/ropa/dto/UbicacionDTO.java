package com.tienda.ropa.dto;

/**
 * Vista de un par piso + área ({@code ubicacion_area}) para el módulo almacenero.
 */
public record UbicacionDTO(
        Long idUbicacionArea,
        String nombre,
        String area,
        String descripcion
) {}
