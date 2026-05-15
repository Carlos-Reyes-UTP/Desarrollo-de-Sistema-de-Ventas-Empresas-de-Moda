package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.Proveedores;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByCategoria(Categoria categoria);
    List<Producto> findByProveedor(Proveedores distribuidor);
    List<Producto> findByCodigoIdentificacion(String codigo);
    List<Producto> findByNombre(String nombre);

    /** Búsqueda parcial por nombre (p. ej. vendedor en piso). */
    List<Producto> findByNombreContainingIgnoreCaseOrderByNombreAsc(String nombre, Pageable pageable);

    Optional<Producto> findByCodigoBarras(String codigoBarras);
    boolean existsByCodigoBarras(String codigoBarras);
    
    // Nuevos métodos para filtrar por categoría padre (categoría principal)
    List<Producto> findByCategoriaPadre(Categoria categoriaPadre);
    
    // Método para filtrar por ambos: categoría padre y subcategoría
    List<Producto> findByCategoriaPadreAndCategoria(Categoria categoriaPadre, Categoria categoria);

    // Paginación sin búsqueda (camino rápido para carga inicial)
    @Query("SELECT p FROM Producto p ORDER BY p.idProducto DESC")
    Page<Producto> findProductosPaginadosSinBusqueda(Pageable pageable);

    // Paginación con búsqueda opcional por nombre, código de identificación o código de barras
    @Query("SELECT p FROM Producto p " +
           "WHERE (p.codigoIdentificacion = :busqueda " +
           "   OR p.codigoBarras = :busqueda " +
           "   OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) " +
           "   OR LOWER(p.codigoIdentificacion) LIKE LOWER(CONCAT('%', :busqueda, '%')) " +
           "   OR LOWER(p.codigoBarras) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
           "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosPaginadosConBusqueda(@Param("busqueda") String busqueda, Pageable pageable);
}
