package com.tienda.ropa.controller;

import com.tienda.ropa.dto.CodigoBarrasDTO;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.service.CodigoBarrasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/almacenero/codigobarras")
@CrossOrigin(origins = "*")
public class CodigoBarrasController {

    @Autowired
    private CodigoBarrasService codigoBarrasService;

    /**
     * Genera un código de barras para un producto
     * @param idProducto ID del producto
     * @param ancho Ancho de la imagen (opcional)
     * @param alto Alto de la imagen (opcional)
     * @return Imagen PNG del código de barras
     */
    @GetMapping(value = "/generar/{idProducto}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<?> generarCodigoBarras(
            @PathVariable Long idProducto,
            @RequestParam(required = false) Integer ancho,
            @RequestParam(required = false) Integer alto) {
        try {
            BufferedImage imagen = codigoBarrasService.generarCodigoBarras(idProducto, ancho, alto);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(imagen, "png", baos);
            byte[] imageBytes = baos.toByteArray();
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(imageBytes);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Genera un código de barras para una variante específica de un producto
     * @param idVariante ID de la variante del producto
     * @param ancho Ancho de la imagen (opcional)
     * @param alto Alto de la imagen (opcional)
     * @return Imagen PNG del código de barras
     */
    @GetMapping(value = "/generar-variante/{idVariante}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<?> generarCodigoBarrasVariante(
            @PathVariable Long idVariante,
            @RequestParam(required = false) Integer ancho,
            @RequestParam(required = false) Integer alto) {
        try {
            BufferedImage imagen = codigoBarrasService.generarCodigoBarrasVariante(idVariante, ancho, alto);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(imagen, "png", baos);
            byte[] imageBytes = baos.toByteArray();
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(imageBytes);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
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
