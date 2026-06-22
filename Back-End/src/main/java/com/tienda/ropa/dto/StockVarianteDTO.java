package com.tienda.ropa.dto;

public record StockVarianteDTO(
    Long idVariante,
    String color,
    String talla,
    int stockTotal,
    int stockAlmacen,
    int stockPisos
) {}
