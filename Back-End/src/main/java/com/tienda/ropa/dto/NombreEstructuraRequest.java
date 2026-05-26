package com.tienda.ropa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NombreEstructuraRequest(
        @NotBlank @Size(max = 120) String nombre
) {}
