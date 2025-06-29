package com.tienda.ropa.controller;

import com.tienda.ropa.dto.CodigoBarrasDTO;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.service.CodigoBarrasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/almacenero/codigobarras")
@CrossOrigin(origins = "*")
public class CodigoBarrasController {

    private static final Logger logger = LoggerFactory.getLogger(CodigoBarrasController.class);
    private final CodigoBarrasService codigoBarrasService;

    public CodigoBarrasController(CodigoBarrasService codigoBarrasService) {
        this.codigoBarrasService = codigoBarrasService;
    }

    /**
     * Endpoint para generar la imagen de un código de barras para un Producto.
     * Utiliza ResponseEntity y el atributo 'produces' para garantizar el tipo de contenido.
     *
     * @param id ID del Producto.
     * @return ResponseEntity con los bytes de la imagen o un error.
     */    // ATRIBUTO 'produces' AÑADIDO para resolver el error HttpMediaTypeNotAcceptableException    @GetMapping(value = "/generar/{id}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generarCodigoBarrasProducto(@PathVariable Long id) {
        try {
            // Log para depuración de autorización
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            logger.info("=== CÓDIGO DE BARRAS DEBUG ===");
            logger.info("Usuario: " + (auth != null ? auth.getName() : "No autenticado"));
            logger.info("Authorities: " + (auth != null ? auth.getAuthorities().toString() : "Sin authorities"));
            logger.info("Tipo de autenticación: " + (auth != null ? auth.getClass().getSimpleName() : "Null"));
            logger.info("Es autenticado: " + (auth != null ? auth.isAuthenticated() : false));
            logger.info("ID del producto solicitado: " + id);
            logger.info("================================");

            byte[] imagenBytes = codigoBarrasService.generarCodigoBarrasProducto(id);
            
            // Configurar headers explícitamente para imagen PNG
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentLength(imagenBytes.length);
            headers.setCacheControl("no-cache");
            
            return new ResponseEntity<>(imagenBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            logger.error("Error al generar código de barras para producto {}: {}", id, e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }



    /**
     * Genera un código de barras para una variante específica de un producto
     * @param idVariante ID de la variante del producto
     * @param ancho Ancho de la imagen (opcional)
     * @param alto Alto de la imagen (opcional)
     * @return Imagen PNG del código de barras
     */    @GetMapping(value = "/generar-variante/{id}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generarCodigoBarrasVariante(@PathVariable Long id) {
        try {
            byte[] imagenBytes = codigoBarrasService.generarCodigoBarrasVariante(id);
            
            // Configurar headers explícitamente para imagen PNG
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentLength(imagenBytes.length);
            headers.setCacheControl("no-cache");
            
            return new ResponseEntity<>(imagenBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            logger.error("Error al generar código de barras para variante {}: {}", id, e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }



    /**
     * Asigna un código de barras personalizado a un producto
     * @param idProducto ID del producto
     * @param codigoBarrasDTO DTO con el código y dimensiones
     * @return Información del producto actualizado
     */
    @PostMapping("/asignar/{idProducto}")
    public ResponseEntity<?> asignarCodigoBarras(
            @PathVariable Long idProducto,
            @RequestBody CodigoBarrasDTO codigoBarrasDTO) {
        try {
            Producto producto = codigoBarrasService.asignarCodigoBarras(idProducto, codigoBarrasDTO);
            return ResponseEntity.ok(producto);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Asigna un código de barras personalizado a una variante de producto
     * @param idVariante ID de la variante del producto
     * @param codigoBarrasDTO DTO con el código y dimensiones
     * @return Información de la variante de producto actualizada
     */
    @PostMapping("/asignar-variante/{idVariante}")
    public ResponseEntity<?> asignarCodigoBarrasVariante(
            @PathVariable Long idVariante,
            @RequestBody CodigoBarrasDTO codigoBarrasDTO) {
        try {
            ProductoVariante variante = codigoBarrasService.asignarCodigoBarrasVariante(idVariante, codigoBarrasDTO);
            return ResponseEntity.ok(variante);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Lee un código de barras a partir de una imagen
     * @param imagen Archivo de imagen con el código de barras
     * @return Código de barras decodificado
     */
    @PostMapping("/leer")
    public ResponseEntity<?> leerCodigoBarras(@RequestParam("imagen") MultipartFile imagen) {
        try {
            String codigo = codigoBarrasService.leerCodigoBarras(imagen.getBytes());
            Map<String, String> response = new HashMap<>();
            response.put("codigo", codigo);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Busca un producto por su código de barras
     * @param codigo Código de barras a buscar
     * @return Producto encontrado
     */
    @GetMapping("/buscar-producto/{codigo}")
    public ResponseEntity<?> buscarProductoPorCodigoBarras(@PathVariable String codigo) {
        try {
            Producto producto = codigoBarrasService.buscarPorCodigoBarras(codigo);
            return ResponseEntity.ok(producto);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Busca una variante de producto por su código de barras
     * @param codigo Código de barras a buscar
     * @return Variante de producto encontrada
     */
    @GetMapping("/buscar-variante/{codigo}")
    public ResponseEntity<?> buscarVariantePorCodigoBarras(@PathVariable String codigo) {
        try {
            ProductoVariante variante = codigoBarrasService.buscarVariantePorCodigoBarras(codigo);
            return ResponseEntity.ok(variante);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Verifica si un código de barras es válido
     * @param codigo Código de barras a validar
     * @return Resultado de la validación
     */
    @GetMapping("/validar")
    public ResponseEntity<?> validarCodigoBarras(@RequestParam String codigo) {
        boolean esValido = codigoBarrasService.validarCodigoBarras(codigo);
        Map<String, Boolean> response = Map.of("valido", esValido);
        return ResponseEntity.ok(response);
    }
}
