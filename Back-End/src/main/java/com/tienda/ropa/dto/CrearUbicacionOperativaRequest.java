package com.tienda.ropa.dto;

import jakarta.validation.constraints.NotNull;

public record CrearUbicacionOperativaRequest(
        @NotNull Long idUbicacion,
        @NotNull Long idArea
) {}
