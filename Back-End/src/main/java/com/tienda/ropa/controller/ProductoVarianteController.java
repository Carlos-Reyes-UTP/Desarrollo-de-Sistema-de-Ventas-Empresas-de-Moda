package com.tienda.ropa.controller;

import com.tienda.ropa.dto.MigrarVariantesRequest;
import com.tienda.ropa.dto.VarianteExportarDTO;
import com.tienda.ropa.dto.VarianteSugerenciasDTO;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.InventarioContextService;
import com.tienda.ropa.service.ProductoVarianteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    @Autowired
    private InventarioContextService inventarioContextService;

    /**
     * Tallas y colores distintos del catálogo (ligero; usar en formularios en lugar de {@code /todas}).
     */
    @GetMapping("/sugerencias")
    public ResponseEntity<VarianteSugerenciasDTO> obtenerSugerenciasCatalogo() {
        return ResponseEntity.ok(productoVarianteService.obtenerSugerenciasCatalogo());
    }

    /**
     * @deprecated Usar {@code GET /sugerencias} o listados paginados. Solo ADMIN (ver seguridad).
     */
    @Deprecated
    @GetMapping("/todas")
    public ResponseEntity<List<ProductoVariante>> obtenerTodasLasVariantes() {
        return ResponseEntity.ok()
                .header("Deprecation", "true")
                .header("Link", "</api/almacenero/variantes/sugerencias>; rel=\"successor-version\"")
                .body(productoVarianteService.obtenerTodasLasVariantes());
    }

    /**
     * Exportación de variantes con datos completos de producto y proveedor.
     * Soporta filtro opcional por área de almacén (nombre del área).
     */
    @GetMapping("/exportar")
    public ResponseEntity<List<VarianteExportarDTO>> exportarListado(
            @RequestParam(required = false) String area) {
        return ResponseEntity.ok(productoVarianteService.exportarListado(area));
    }

    @PostMapping
    public ResponseEntity<ProductoVariante> crearVariante(
            @RequestBody ProductoVariante productoVariante,
            @RequestParam(required = false) Long idUbicacionArea,
            @AuthenticationPrincipal Usuario usuario) {
        UbicacionArea area = inventarioContextService.resolverAreaParaAltaStock(usuario, idUbicacionArea);
        ProductoVariante nuevaVariante = productoVarianteService.crearVariante(productoVariante, area);
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
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProducto(
            @PathVariable Long idProducto,
            @RequestParam(required = false) Long idUbicacionArea,
            @AuthenticationPrincipal Usuario usuario) {
        Long idAreaLectura = idUbicacionArea;
        if (idAreaLectura == null
                && usuario != null
                && inventarioContextService.esAlmaceneroDeLinea(usuario)
                && usuario.getAreaAsignado() != null) {
            idAreaLectura = usuario.getAreaAsignado().getIdUbicacionArea();
        }
        List<ProductoVariante> variantes =
                productoVarianteService.obtenerVariantesPorProducto(idProducto, idAreaLectura);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/talla")
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProductoYTalla(
            @PathVariable Long idProducto,
            @RequestParam("nombre") String nombreTalla) {
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProductoYTallaNombre(idProducto, nombreTalla);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/color")
    public ResponseEntity<List<ProductoVariante>> obtenerVariantesPorProductoYColor(
            @PathVariable Long idProducto,
            @RequestParam("nombre") String nombreColor) {
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProductoYColorNombre(idProducto, nombreColor);
        return ResponseEntity.ok(variantes);
    }

    @GetMapping("/producto/{idProducto}/combinacion")
    public ResponseEntity<ProductoVariante> obtenerVariantePorProductoTallaColor(
            @PathVariable Long idProducto,
            @RequestParam String talla,
            @RequestParam String color) {
        Optional<ProductoVariante> variante = productoVarianteService.obtenerVariantePorProductoTallaColorNombre(idProducto, talla, color);
        return variante.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/cantidad")
    public ResponseEntity<ProductoVariante> actualizarCantidad(
            @PathVariable("id") Long idVariante,
            @RequestParam Integer cantidad,
            @RequestParam(required = false) Long idUbicacionArea,
            @AuthenticationPrincipal Usuario usuario) {
        if (cantidad < 0) {
            return ResponseEntity.badRequest().build();
        }
        UbicacionArea area = inventarioContextService.resolverAreaParaAltaStock(usuario, idUbicacionArea);
        ProductoVariante varianteActualizada =
                productoVarianteService.actualizarCantidad(idVariante, cantidad, area);
        return ResponseEntity.ok(varianteActualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarVariante(@PathVariable("id") Long idVariante) {
        try {
            productoVarianteService.eliminarVariante(idVariante);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
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
            @RequestBody MigrarVariantesRequest body,
            @RequestParam(defaultValue = "false") boolean distribucionPorcentual,
            @RequestParam(required = false) Long idUbicacionArea,
            @AuthenticationPrincipal Usuario usuario) {
        UbicacionArea area = inventarioContextService.resolverAreaParaAltaStock(usuario, idUbicacionArea);
        List<ProductoVariante> variantes = productoVarianteService.migrarProductoAVariantes(
                idProducto, body.tallas(), body.colores(), distribucionPorcentual, area);
        return ResponseEntity.ok(variantes);
    }
}
