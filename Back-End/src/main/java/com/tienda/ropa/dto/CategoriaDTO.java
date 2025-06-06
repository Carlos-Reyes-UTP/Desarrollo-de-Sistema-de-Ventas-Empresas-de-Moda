package com.tienda.ropa.dto;
import com.tienda.ropa.entity.Categoria;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class CategoriaDTO {
    private Long id;
    private String nombre;
    private List<CategoriaDTO> subcategorias = new ArrayList<>();
    
    // Constructor vacío
    public CategoriaDTO() {
    }
    
    // Constructor para convertir desde entidad
    public CategoriaDTO(Categoria categoria) {
        this.id = categoria.getIdCategoria();
        this.nombre = categoria.getNombre();
        // No convertimos las subcategorías aquí para evitar carga automática
    }
    
    // Constructor para convertir desde entidad con subcategorías
    public CategoriaDTO(Categoria categoria, boolean incluirSubcategorias) {
        this.id = categoria.getIdCategoria();
        this.nombre = categoria.getNombre();
        
        if (incluirSubcategorias && categoria.getSubCategorias() != null) {
            this.subcategorias = categoria.getSubCategorias().stream()
                .map(subCat -> new CategoriaDTO(subCat, true))
                .collect(Collectors.toList());
        }
    }
    
    // Método estático para convertir una lista de categorías a DTOs
    public static List<CategoriaDTO> convertirLista(List<Categoria> categorias) {
        return categorias.stream()
            .map(CategoriaDTO::new)
            .collect(Collectors.toList());
    }
    
    // Método estático para convertir una lista de categorías a DTOs incluyendo subcategorías
    public static List<CategoriaDTO> convertirListaConSubcategorias(List<Categoria> categorias) {
        return categorias.stream()
            .map(cat -> new CategoriaDTO(cat, true))
            .collect(Collectors.toList());
    }
}