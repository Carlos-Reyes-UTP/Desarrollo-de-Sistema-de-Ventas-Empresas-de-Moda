package com.tienda.ropa.dto;

import java.math.BigDecimal;

/**
 * Una fila de coincidencia de búsqueda del vendedor a nivel variante (no producto padre).
 */
public record VendedorVarianteCoincidenciaDTO(
        Long idProductoVariante,
        Long idProducto,
        String nombreProducto,
        String talla,
        String color,
        String sku,
        String codigoBarras,
        BigDecimal precioUnitario,
        int stockAlmacen
) {}
