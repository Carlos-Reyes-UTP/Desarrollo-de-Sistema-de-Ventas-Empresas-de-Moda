package com.tienda.ropa.controller;

import com.tienda.ropa.dto.CategoriaDTO;
import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.service.CategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {
    @Autowired
    private CategoriaService categoriaService;

    // Obtener todas las categorías
    // @GetMapping("/categorias")
    @GetMapping
    public ResponseEntity<List<Categoria>> obtenerCategorias() {
        List<Categoria> categorias = categoriaService.obtenerCategorias();
        return ResponseEntity.ok(categorias);
    }

    // Obtener todas las categorías principales (sin padre)
    @GetMapping("/principales")
    public ResponseEntity<List<Categoria>> obtenerCategoriasPrincipales() {
        List<Categoria> categorias = categoriaService.obtenerCategoriasPrincipales();
        return ResponseEntity.ok(categorias);
    }

    // Obtener una categoría por ID
    @GetMapping("/{id}")
    public ResponseEntity<Categoria> obtenerCategoriaPorId(@PathVariable Long id) {
        Optional<Categoria> categoria = categoriaService.obtenerCategoriaPorId(id);
        return categoria.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("{id}/subcategorias")
    public ResponseEntity<List<Categoria>> obtenerSubcategoriasPorId(@PathVariable Long id) {
        List<Categoria> subcategorias = categoriaService.obtenerSubcategorias(id);
        return ResponseEntity.ok(subcategorias);
    }

    @PostMapping
    public ResponseEntity<Categoria> crearCategoria(@RequestBody CategoriaDTO categoriaDto) {
        Categoria nuevaCategoria = categoriaService.crearCategoria(categoriaDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaCategoria);
    }
    
    // Crear una subcategoría

    @PostMapping("/{idPadre}/subcategorias")
    public ResponseEntity<Categoria> crearSubcategoria(@PathVariable Long idPadre,
            @RequestBody Categoria subcategoria) {
        try {
            Categoria nuevaSubcategoria = categoriaService.crearSubcategoria(idPadre, subcategoria);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaSubcategoria);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }

    }

    // Actualizar una categoría
    @PutMapping("/{id}")
    public ResponseEntity<Categoria> actualizarCategoria(
            @PathVariable Long id,
            @RequestBody Categoria categoria) {
        try {
            Categoria categoriaActualizada = categoriaService.editarCategoria(id, categoria);
            return ResponseEntity.ok(categoriaActualizada);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Mover una categoría a otro padre
    @PatchMapping("/{id}/mover")
    public ResponseEntity<Categoria> moverCategoria(
            @PathVariable Long id,
            @RequestBody Map<String, Long> datos) {
        try {
            Long idNuevoPadre = datos.get("idNuevoPadre"); // puede ser null
            Categoria categoriaMoved = categoriaService.moverCategoria(id, idNuevoPadre);
            return ResponseEntity.ok(categoriaMoved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    // Eliminar una categoría
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarCategoria(@PathVariable Long id) {
        try {
            categoriaService.eliminarCategoria(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Buscar categorías por nombre
    @GetMapping("/buscar")
    public ResponseEntity<List<Categoria>> buscarPorNombre(@RequestParam String nombre) {
        return ResponseEntity.ok(categoriaService.buscarPorNombre(nombre));
    }

}
