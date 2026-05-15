package com.tienda.ropa.dto;

import java.util.List;

/**
 * Stock disponible para enviar a pisos: por variante se prioriza fila en Almacén;
 * si no hay stock allí (p. ej. datos migrados en V7 solo en Principal), se usa la fila en Principal.
 * Cada {@link StockUbicacionDTO} conserva su {@code idUbicacion} real para el POST de traslado.
 */
public record StockDesdeAlmacenDTO(
        Long idUbicacionOrigen,
        String nombreUbicacion,
        List<StockUbicacionDTO> stock
) {}
