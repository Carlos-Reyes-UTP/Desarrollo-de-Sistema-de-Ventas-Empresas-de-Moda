package com.tienda.ropa.dto;

public record StockProductoDTO(
    Long idProducto,
    String nombre,
    String codigoIdentificacion,
    String categoria,
    int stockTotal,
    int stockAlmacen,
    int stockPisos
) {}
