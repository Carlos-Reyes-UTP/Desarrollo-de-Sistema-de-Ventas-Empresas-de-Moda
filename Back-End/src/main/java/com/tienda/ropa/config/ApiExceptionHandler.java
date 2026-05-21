package com.tienda.ropa.config;

import java.util.Map;

import org.hibernate.LazyInitializationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.PersistenceException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : ex.getStatusCode().toString();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String message = mensajeAmigableIntegridad(ex);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "Solicitud inválida"));
    }

    @ExceptionHandler(LazyInitializationException.class)
    public ResponseEntity<Map<String, String>> handleLazyInitialization(LazyInitializationException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message",
                        "Error de carga lazy: inicialice las relaciones dentro de la transacción (fetch join o @Transactional)."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String param = ex.getName() != null ? ex.getName() : "parámetro";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", "ID inválido en " + param + "."));
    }

    @ExceptionHandler(PersistenceException.class)
    public ResponseEntity<Map<String, String>> handlePersistence(PersistenceException ex) {
        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof IllegalArgumentException iae) {
                return handleIllegalArgument(iae);
            }
            cause = cause.getCause();
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", "No se pudo guardar: revise los datos enviados."));
    }

    private static String mensajeAmigableIntegridad(DataIntegrityViolationException ex) {
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (raw == null) {
            return "No se pudo guardar: conflicto con datos existentes.";
        }
        if (raw.contains("producto_codigo_identificacion_key") || raw.contains("codigo_identificacion")) {
            return "Ya existe un producto con ese código de identificación. Use otro código.";
        }
        if (raw.contains("codigo_barras")) {
            return "Ya existe un producto con ese código de barras.";
        }
        if (raw.contains("llave duplicada") || raw.contains("duplicate key")) {
            return "Ya existe un registro con esos datos. Revise códigos únicos.";
        }
        return "No se pudo guardar: conflicto con datos existentes.";
    }
}
