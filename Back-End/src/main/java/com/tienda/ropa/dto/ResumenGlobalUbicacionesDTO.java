package com.tienda.ropa.dto;

public record ResumenGlobalUbicacionesDTO(
        int totalUbicaciones,
        int totalOperativas,
        int totalConStock,
        long totalUnidades
) {}
