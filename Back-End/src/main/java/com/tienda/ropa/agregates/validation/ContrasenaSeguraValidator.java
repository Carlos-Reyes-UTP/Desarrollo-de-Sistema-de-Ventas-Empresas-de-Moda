package com.tienda.ropa.agregates.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class ContrasenaSeguraValidator implements ConstraintValidator<ContrasenaSegura, String> {

    private static final Pattern MINUSCULA = Pattern.compile(".*[a-z].*");
    private static final Pattern MAYUSCULA = Pattern.compile(".*[A-Z].*");
    private static final Pattern NUMERO = Pattern.compile(".*[0-9].*");
    private static final Pattern SIMBOLO = Pattern.compile(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*");

    @Override
    public void initialize(ContrasenaSegura constraintAnnotation) {
        // No necesita inicialización
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }

        boolean esValida = true;
        context.disableDefaultConstraintViolation();

        // Validar largo mínimo
        if (password.length() < 8) {
            context.buildConstraintViolationWithTemplate("La contraseña debe tener al menos 8 caracteres")
                    .addConstraintViolation();
            esValida = false;
        }

        // Validar letra minúscula
        if (!MINUSCULA.matcher(password).matches()) {
            context.buildConstraintViolationWithTemplate("La contraseña debe contener al menos una letra minúscula")
                    .addConstraintViolation();
            esValida = false;
        }

        // Validar letra mayúscula
        if (!MAYUSCULA.matcher(password).matches()) {
            context.buildConstraintViolationWithTemplate("La contraseña debe contener al menos una letra mayúscula")
                    .addConstraintViolation();
            esValida = false;
        }

        // Validar número
        if (!NUMERO.matcher(password).matches()) {
            context.buildConstraintViolationWithTemplate("La contraseña debe contener al menos un número")
                    .addConstraintViolation();
            esValida = false;
        }

        // Validar símbolo especial
        if (!SIMBOLO.matcher(password).matches()) {
            context.buildConstraintViolationWithTemplate("La contraseña debe contener al menos un símbolo especial (!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?)")
                    .addConstraintViolation();
            esValida = false;
        }

        return esValida;
    }
}

