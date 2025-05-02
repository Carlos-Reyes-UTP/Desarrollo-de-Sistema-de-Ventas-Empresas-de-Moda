package com.tienda.ropa.controller;

import com.tienda.ropa.dto.CategoriaDTO;
import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.service.CategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador específico para operaciones relacionadas con la vista jerárquica
 * de categorías (árbol de categorías). Esto facilita la manipulación en el frontend.
 */
@RestController
@RequestMapping("/api/categorias-tree")
@CrossOrigin(origins = "*")
public class ArbolDeCategoriasController {
    @Autowired
    private CategoriaService categoriaService;

    /**
     * Obtiene todas las categorías en formato de árbol.
     *
     * @return Lista de categorías en formato de árbol.
     */
    @GetMapping
    public ResponseEntity<List<CategoriaDTO>> obtenerCategoriasTree() {
        List<CategoriaDTO> categoriasTree = categoriaService.obtenerCategoriasTree();
        return ResponseEntity.ok(categoriasTree);
    }

    /**
     * Crea una nueva categoría en el árbol de categorías.
     *
     * @param categoriaDTO Datos de la categoría a crear.
     * @return La categoría creada.
     */
    @PostMapping
    public ResponseEntity<Categoria> crearCategoria(@RequestBody CategoriaDTO categoriaDTO) {
        Categoria nuevaCategoria = categoriaService.crearCategoria(categoriaDTO);
        return ResponseEntity.status(201).body(nuevaCategoria);
    }


}