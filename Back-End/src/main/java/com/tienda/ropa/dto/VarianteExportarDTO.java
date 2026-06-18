package com.tienda.ropa.dto;

import java.math.BigDecimal;

public record VarianteExportarDTO(
    String codigoProducto,
    String nombreProducto,
    String talla,
    String color,
    String proveedor,
    BigDecimal precioUnitario,
    BigDecimal precioCuarto,
    BigDecimal precioMediaDocena,
    BigDecimal precioDocena,
    Integer stock
) {}
