package com.tienda.ropa.dto;

public record UbicacionOperativaDTO(
        Long idUbicacionArea,
        Long idUbicacion,
        String nombrePiso,
        Long idArea,
        String nombreArea,
        boolean activo,
        boolean pisoActivo,
        boolean areaActivo,
        boolean operativa,
        long totalUnidades,
        long totalVariantesConStock
) {}
