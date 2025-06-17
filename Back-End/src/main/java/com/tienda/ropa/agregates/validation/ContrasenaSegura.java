package com.tienda.ropa.agregates.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ContrasenaSeguraValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ContrasenaSegura {
    String message() default "La contraseña no cumple con los requisitos de seguridad";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
