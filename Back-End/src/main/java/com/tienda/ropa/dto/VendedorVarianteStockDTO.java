package com.tienda.ropa.dto;

public record VendedorVarianteStockDTO(
        Long idProductoVariante,
        String talla,
        String color,
        String codigoBarras,
        int stockAlmacen,
        /** Área destino conocida para esta variante. Null si nunca salió del almacén. */
        Long idUbicacionAreaDestino,
        /** Nombre legible del área destino. Null si no está asignada. */
        String nombreUbicacion
) {}
