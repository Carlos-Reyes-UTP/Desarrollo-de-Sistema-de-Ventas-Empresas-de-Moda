package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Talla;
import com.tienda.ropa.service.ProductoVarianteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/almacenero/variantes")
@CrossOrigin(origins = "*")
public class ProductoVarianteController {

    @Autowired
    private ProductoVarianteService productoVarianteService;

    @PostMapping
    public ResponseEntity<ProductoVariante> crearVariante(@RequestBody ProductoVariante productoVariante) {
        ProductoVariante nuevaVariante = productoVarianteService.crearVariante(productoVariante);
        return new ResponseEntity<>(nuevaVariante, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoVariante> actualizarVariante(@PathVariable("id") Long idVariante,
                                                             @RequestBody ProductoVariante productoVariante) {
        ProductoVariante varianteActualizada = productoVarianteService.actualizarVariante(idVariante, productoVariante);
        return ResponseEntity.ok(varianteActualizada);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoVariante> obtenerVariantePorId(@PathVariable("id") Long idVariante) {
        Optional<ProductoVariante> variante = productoVarianteService.obtenerVariantePorId(idVariante);
        return variante.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/producto/{idProducto}")
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProducto(@PathVariable Long idProducto) {
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProducto(idProducto);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/talla/{idTalla}")
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProductoYTalla(
            @PathVariable Long idProducto,
            @PathVariable Long idTalla) {
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProductoYTalla(idProducto, idTalla);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/color/{idColor}")
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProductoYColor(
            @PathVariable Long idProducto,
            @PathVariable Long idColor) {
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProductoYColor(idProducto, idColor);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/talla/{idTalla}/color/{idColor}")
    public ResponseEntity<ProductoVariante> obtenerVariantePorProductoTallaColor(
            @PathVariable Long idProducto,
            @PathVariable Long idTalla,
            @PathVariable Long idColor) {
        Optional<ProductoVariante> variante = productoVarianteService.obtenerVariantePorProductoTallaColor(idProducto, idTalla, idColor);
        return variante.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/cantidad")
    public ResponseEntity<ProductoVariante> actualizarCantidad(
            @PathVariable("id") Long idVariante,
            @RequestParam Integer cantidad) {
        if (cantidad < 0) {
            return ResponseEntity.badRequest().build();
        }
        ProductoVariante varianteActualizada = productoVarianteService.actualizarCantidad(idVariante, cantidad);
        return ResponseEntity.ok(varianteActualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarVariante(@PathVariable("id") Long idVariante) {
        try {
            productoVarianteService.eliminarVariante(idVariante);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            // Error por variante no encontrada
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            // Error al eliminar la variante
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // Error inesperado
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error inesperado al eliminar la variante: " + e.getMessage()));
        }
    }

    @GetMapping("/producto/{idProducto}/cantidad-total")
    public ResponseEntity<Integer> obtenerCantidadTotalProducto(@PathVariable Long idProducto) {
        Integer cantidadTotal = productoVarianteService.obtenerCantidadTotalProducto(idProducto);
        return ResponseEntity.ok(cantidadTotal);
    }

    @PostMapping("/producto/{idProducto}/migrar")
    public ResponseEntity<List<ProductoVariante>> migrarProductoAVariantes(
            @PathVariable Long idProducto,
            @RequestBody List<Talla> tallas,
            @RequestBody List<Color> colores,
            @RequestParam(defaultValue = "false") boolean distribucionPorcentual) {
        List<ProductoVariante> variantes = productoVarianteService.migrarProductoAVariantes(
                idProducto, tallas, colores, distribucionPorcentual);
        return ResponseEntity.ok(variantes);
    }
}
