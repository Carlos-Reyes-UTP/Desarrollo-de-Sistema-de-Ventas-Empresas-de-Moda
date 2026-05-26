package com.tienda.ropa.dto;

public record PisoDTO(
        Long idUbicacion,
        String nombre,
        boolean activo,
        boolean reservado
) {}
