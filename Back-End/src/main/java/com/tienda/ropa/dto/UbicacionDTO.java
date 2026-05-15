package com.tienda.ropa.dto;

/**
 * Vista plana de una fila {@code ubicacion} para el módulo almacenero.
 * {@code area} y {@code descripcion} pueden venir nulos.
 */
public record UbicacionDTO(
        Long idUbicacion,
        String nombre,
        String area,
        String descripcion
) {}
