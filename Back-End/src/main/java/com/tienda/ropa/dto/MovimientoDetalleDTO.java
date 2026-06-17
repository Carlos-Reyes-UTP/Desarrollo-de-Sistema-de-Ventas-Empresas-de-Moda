package com.tienda.ropa.dto;

public record MovimientoDetalleDTO(
    Long idVariante,
    String color,
    String talla,
    String sku,
    Integer cantidad
) {}
