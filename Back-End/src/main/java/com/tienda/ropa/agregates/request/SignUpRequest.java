package com.tienda.ropa.agregates.request;

import jakarta.validation.constraints.NotBlank;

public record SignUpRequest(
        @NotBlank(message = "El nombre de usuario no puede estar vacío") String usuario,
        @NotBlank(message = "La contraseña no puede estar vacía") String clave,
        @NotBlank(message = "El rol no puede estar vacío") String rol // Nuevo campo para el rol
) {}
