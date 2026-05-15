package com.tienda.ropa.dto;

import java.util.List;

public record MigrarVariantesRequest(List<String> tallas, List<String> colores) {}
