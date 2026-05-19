package com.tienda.ropa.dto;

import java.util.List;

/**
 * Stock disponible en Almacén para distribuir a pisos.
 */
public record StockDesdeAlmacenDTO(
        Long idUbicacionAreaOrigen,
        String etiquetaAlmacen,
        List<StockUbicacionDTO> filas
) {}
