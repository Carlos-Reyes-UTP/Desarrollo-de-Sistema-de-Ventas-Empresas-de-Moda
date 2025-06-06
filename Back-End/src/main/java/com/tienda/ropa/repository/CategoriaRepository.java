package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    Optional<Categoria> findByNombre(String nombre);

    @Query("SELECT c FROM Categoria c WHERE c.categoriaPadre IS NULL")
    List<Categoria> findAllCategoriasPrincipales();

    // Encuentra todas las subcategorías de una categoría específica
    List<Categoria> findByCategoriaPadreIdCategoria(Long idCategoriaPadre);

    // Buscar categorías por nombre
    List<Categoria> findByNombreContainingIgnoreCase(String nombre);

    List<Categoria> findByCategoriaPadreIsNull();
}
