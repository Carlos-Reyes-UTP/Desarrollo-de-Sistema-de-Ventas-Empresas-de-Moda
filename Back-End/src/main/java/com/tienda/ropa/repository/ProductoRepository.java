package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.Proveedores;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByCategoria(Categoria categoria);
    List<Producto> findByProveedor(Proveedores distribuidor);
    List<Producto> findByCodigoIdentificacion(String codigo);
    List<Producto> findByNombre(String nombre);
    Optional<Producto> findByCodigoBarras(String codigoBarras);
    boolean existsByCodigoBarras(String codigoBarras);
    
    // Nuevos métodos para filtrar por categoría padre (categoría principal)
    List<Producto> findByCategoriaPadre(Categoria categoriaPadre);
    
    // Método para filtrar por ambos: categoría padre y subcategoría
    List<Producto> findByCategoriaPadreAndCategoria(Categoria categoriaPadre, Categoria categoria);
}
