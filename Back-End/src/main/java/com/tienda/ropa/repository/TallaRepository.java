package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tienda.ropa.entity.Talla;

public interface TallaRepository extends JpaRepository<Talla, Long> {

    // Buscar todas las tallas de un producto específico
    List<Talla> findByProductoIdProducto(Long idProducto);

    // Buscar una talla específica de un producto
    Optional<Talla> findByProductoIdProductoAndNombreTalla(Long idProducto, String nombreTalla);

    // Buscar tallas por nombre (ej: todas las tallas "M" de todos los productos)
    List<Talla> findByNombreTalla(String nombreTalla);
}