package com.tienda.ropa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.tienda.ropa.entity.Producto;
import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Producto, Long> {

    // 1. Total de productos
    @Query("SELECT COUNT(p) FROM Producto p")
    long countTotalProductos();

    // 2. Productos con bajo stock (entre 1 y 15 unidades)
    // Se suma la cantidad total usando el campo cantidad base del producto 
    // o calculando si usamos un enfoque más complejo. Por ahora usamos p.cantidad
    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad > 0 AND p.cantidad <= 15")
    long countProductosBajoStock();

    // 3. Productos sin stock
    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad = 0")
    long countProductosSinStock();

    // 4. Stock crítico (entre 1 y 5 unidades)
    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad > 0 AND p.cantidad <= 5")
    long countProductosStockCritico();

    // 5. Distribución por categorías
    // Agrupa por el nombre de la categoría principal si existe, si no por la subcategoría
    @Query("SELECT COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría'), COUNT(p) " +
           "FROM Producto p " +
           "GROUP BY COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría') " +
           "ORDER BY COUNT(p) DESC")
    List<Object[]> getDistribucionCategorias();
}
