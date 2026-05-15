package com.tienda.ropa.dto;

public record AlmacenSolicitudLineaDTO(
        Long idVariante,
        String sku,
        String descripcion,
        Integer cantidad
) {}
