package com.tienda.ropa.dto;

import java.time.Instant;

public record VendedorSolicitudResumenDTO(
        Long idSolicitud,
        String tipoSolicitud,
        String estado,
        Instant fechaCreacion,
        Integer cantidad,
        Long idVariante,
        String nombreProducto,
        String talla,
        String color
) {}
