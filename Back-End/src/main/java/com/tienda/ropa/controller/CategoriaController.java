package com.tienda.ropa.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.CategoriaDTO;
import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.service.CategoriaService;

@RestController
@RequestMapping("/api/almacenero/categorias")
public class CategoriaController {
    @Autowired
    private CategoriaService categoriaService;

    // Obtener todas las categorías
    // @GetMapping("/categorias")
    @GetMapping
    public ResponseEntity<List<CategoriaDTO>> obtenerCategorias() {
        List<CategoriaDTO> dtoList = CategoriaDTO.convertirLista(categoriaService.obtenerCategorias());
        return ResponseEntity.ok(dtoList);
    }

    // Obtener todas las categorías principales (sin padre)
    @GetMapping("/principales")
    public ResponseEntity<List<CategoriaDTO>> obtenerCategoriasPrincipales() {
        List<CategoriaDTO> categorias = categoriaService.obtenerCategoriasPrincipalesConSubcategorias();
        return ResponseEntity.ok(categorias);
    }

    // Obtener una categoría por ID
    @GetMapping("/{id}")
    public ResponseEntity<CategoriaDTO> obtenerCategoriaPorId(@PathVariable Long id) {
        return categoriaService.obtenerCategoriaPorId(id)
                .map(cat -> ResponseEntity.ok(new CategoriaDTO(cat)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("{id}/subcategorias")
    public ResponseEntity<List<CategoriaDTO>> obtenerSubcategoriasPorId(@PathVariable Long id) {
        List<CategoriaDTO> dtoList = CategoriaDTO.convertirLista(categoriaService.obtenerSubcategorias(id));
        return ResponseEntity.ok(dtoList);
    }

    @PostMapping
    public ResponseEntity<CategoriaDTO> crearCategoria(@RequestBody CategoriaDTO categoriaDto) {
        Categoria nuevaCategoria = categoriaService.crearCategoria(categoriaDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(new CategoriaDTO(nuevaCategoria));
    }
    
    // Crear una subcategoría

    @PostMapping("/{idPadre}/subcategorias")
    public ResponseEntity<?> crearSubcategoria(@PathVariable Long idPadre,
            @RequestBody Categoria subcategoria) {
        try {
            Categoria nuevaSubcategoria = categoriaService.crearSubcategoria(idPadre, subcategoria);
            return ResponseEntity.status(HttpStatus.CREATED).body(new CategoriaDTO(nuevaSubcategoria));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }

    }

    // Actualizar una categoría
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarCategoria(
            @PathVariable Long id,
            @RequestBody Categoria categoria) {
        try {
            Categoria categoriaActualizada = categoriaService.editarCategoria(id, categoria);
            return ResponseEntity.ok(new CategoriaDTO(categoriaActualizada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Mover una categoría a otro padre
    @PatchMapping("/{id}/mover")
    public ResponseEntity<?> moverCategoria(
            @PathVariable Long id,
            @RequestBody Map<String, Long> datos) {
        try {
            Long idNuevoPadre = datos.get("idNuevoPadre");
            Categoria categoriaMoved = categoriaService.moverCategoria(id, idNuevoPadre);
            return ResponseEntity.ok(new CategoriaDTO(categoriaMoved));
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
    public ResponseEntity<List<CategoriaDTO>> buscarPorNombre(@RequestParam String nombre) {
        return ResponseEntity.ok(CategoriaDTO.convertirLista(categoriaService.buscarPorNombre(nombre)));
    }

}
