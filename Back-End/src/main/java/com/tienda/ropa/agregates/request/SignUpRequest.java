package com.tienda.ropa.agregates.request;

import com.tienda.ropa.agregates.validation.ContrasenaSegura;

import jakarta.validation.constraints.NotBlank;

public record SignUpRequest(
        @NotBlank(message = "El nombre de usuario no puede estar vacío") String usuario,
        @NotBlank(message = "La contraseña no puede estar vacía") 
        @ContrasenaSegura 
        String clave,
        @NotBlank(message = "El rol no puede estar vacío") String rol, // Campo para el rol
        Boolean activo // Campo para el estado activo (opcional, por defecto true)
) {}
