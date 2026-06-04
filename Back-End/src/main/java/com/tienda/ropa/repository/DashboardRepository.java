package com.tienda.ropa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tienda.ropa.entity.Producto;
import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Producto, Long> {

    @Query("SELECT COUNT(p) FROM Producto p")
    long countTotalProductos();

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad > 0 AND p.cantidad <= 15")
    long countProductosBajoStock();

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad = 0")
    long countProductosSinStock();

    @Query("SELECT COUNT(p) FROM Producto p WHERE p.cantidad > 0 AND p.cantidad <= 5")
    long countProductosStockCritico();

    @Query("SELECT COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría'), COUNT(p) "
            + "FROM Producto p "
            + "GROUP BY COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría') "
            + "ORDER BY COUNT(p) DESC")
    List<Object[]> getDistribucionCategorias();

    /** Stock total por producto en todas las UA de la línea ({@code id_area}). */
    @Query("SELECT v.producto.idProducto, COALESCE(SUM(COALESCE(i.stock, 0)), 0) "
            + "FROM Inventario i "
            + "JOIN i.variante v "
            + "JOIN i.ubicacionArea ua "
            + "JOIN ua.area a "
            + "WHERE a.idArea = :idAreaCatalogo "
            + "GROUP BY v.producto.idProducto")
    List<Object[]> sumStockPorProductoEnLinea(@Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("SELECT COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría'), COUNT(DISTINCT p.idProducto) "
            + "FROM Inventario i "
            + "JOIN i.variante v "
            + "JOIN v.producto p "
            + "JOIN i.ubicacionArea ua "
            + "JOIN ua.area a "
            + "WHERE a.idArea = :idAreaCatalogo "
            + "GROUP BY COALESCE(p.categoriaPadre.nombre, p.categoria.nombre, 'Sin Categoría') "
            + "ORDER BY COUNT(DISTINCT p.idProducto) DESC")
    List<Object[]> getDistribucionCategoriasEnLinea(@Param("idAreaCatalogo") Long idAreaCatalogo);
}
