package com.tienda.ropa.dto;

import java.util.List;

/**
 * Catálogo ligero de tallas/colores existentes (autocompletado en formularios).
 */
public record VarianteSugerenciasDTO(List<String> tallas, List<String> colores) {}
