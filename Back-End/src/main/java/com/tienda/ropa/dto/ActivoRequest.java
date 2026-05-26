package com.tienda.ropa.dto;

import jakarta.validation.constraints.NotNull;

public record ActivoRequest(
        @NotNull Boolean activo
) {}
