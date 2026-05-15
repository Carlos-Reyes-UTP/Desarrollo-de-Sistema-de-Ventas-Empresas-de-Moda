package com.tienda.ropa.dto;

public record VendedorVarianteStockDTO(
        Long idProductoVariante,
        String talla,
        String color,
        String codigoBarras,
        int stockAlmacen
) {}
