package com.tienda.ropa.dto;

/**
 * Resumen de una ubicación (piso/área) expuesta al vendedor de piso.
 * Solo incluye campos necesarios para el selector de área en el frontend.
 */
public record VendedorUbicacionDTO(
        Long idUbicacionArea,
        String nombre,
        String area
) {}
