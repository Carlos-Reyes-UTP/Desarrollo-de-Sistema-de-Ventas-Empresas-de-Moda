package com.tienda.ropa.dto;

import java.math.BigDecimal;

public record VendedorProductoResumenDTO(
        Long idProducto,
        String nombre,
        BigDecimal precioUnitario,
        int stockTotal
) {}
