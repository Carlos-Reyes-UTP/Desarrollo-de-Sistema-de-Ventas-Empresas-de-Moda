package com.tienda.ropa.agregates.request;

import jakarta.validation.constraints.NotBlank;

public record SignInRequest(
        @NotBlank(message = "El nombre de usuario no puede estar vacío") String usuario,
        @NotBlank(message = "La contraseña no puede estar vacía") String clave
) {}
