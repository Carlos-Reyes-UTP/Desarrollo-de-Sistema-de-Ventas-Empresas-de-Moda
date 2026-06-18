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
    boolean existsByCodigoIdentificacion(String codigoIdentificacion);
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
    @Query("SELECT p FROM Producto p "
            + "LEFT JOIN FETCH p.categoria "
            + "LEFT JOIN FETCH p.subCategoria2 "
            + "LEFT JOIN FETCH p.categoriaPadre "
            + "LEFT JOIN FETCH p.proveedor "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosPaginadosSinBusqueda(Pageable pageable);

    // Stock de Almacén agrupado por producto (todos los sectores)
    @Query(value = """
        SELECT pv.id_producto, COALESCE(SUM(CASE WHEN LOWER(TRIM(u.nombre)) IN ('almacén', 'almacen') THEN i.stock ELSE 0 END), 0)
        FROM producto_variante pv
        LEFT JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
        LEFT JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
        LEFT JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
        WHERE pv.id_producto IN :ids
        GROUP BY pv.id_producto
        """, nativeQuery = true)
    List<Object[]> findStockAlmacenByProductoIds(@Param("ids") List<Long> ids);

    @Query(value = """
        SELECT pv.id_producto, COALESCE(SUM(i.stock), 0)
        FROM producto_variante pv
        LEFT JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
            AND i.id_ubicacion_area = :idUbicacionArea
        WHERE pv.id_producto IN :ids
        GROUP BY pv.id_producto
        """, nativeQuery = true)
    List<Object[]> findStockAlmacenByProductoIdsAndUbicacionArea(
            @Param("ids") List<Long> ids,
            @Param("idUbicacionArea") Long idUbicacionArea);

    @Query(value = """
        SELECT pv.id_producto, COALESCE(SUM(CASE WHEN LOWER(TRIM(u.nombre)) IN ('almacén', 'almacen') AND a.id_area = :idAreaCatalogo THEN i.stock ELSE 0 END), 0)
        FROM producto_variante pv
        LEFT JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
        LEFT JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
        LEFT JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
        LEFT JOIN area a ON a.id_area = ua.id_area
        WHERE pv.id_producto IN :ids
        GROUP BY pv.id_producto
        """, nativeQuery = true)
    List<Object[]> findStockAlmacenByProductoIdsAndAreaCatalogo(
            @Param("ids") List<Long> ids,
            @Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("SELECT DISTINCT p FROM Producto p "
            + "WHERE EXISTS (SELECT 1 FROM ProductoVariante pv JOIN Inventario i ON i.variante = pv "
            + "WHERE pv.producto = p AND i.ubicacionArea.idUbicacionArea = :idUbicacionArea) "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosConStockEnUbicacionArea(
            @Param("idUbicacionArea") Long idUbicacionArea,
            Pageable pageable);

    @Query("SELECT DISTINCT p FROM Producto p "
            + "WHERE EXISTS (SELECT 1 FROM ProductoVariante pv JOIN Inventario i ON i.variante = pv "
            + "JOIN i.ubicacionArea ua JOIN ua.area a JOIN ua.ubicacion u "
            + "WHERE pv.producto = p "
            + "AND LOWER(TRIM(u.nombre)) IN ('almacén', 'almacen') AND a.idArea = :idAreaCatalogo) "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosConStockEnSectorAlmacen(
            @Param("idAreaCatalogo") Long idAreaCatalogo,
            Pageable pageable);

    @Query("SELECT DISTINCT p FROM Producto p "
            + "WHERE EXISTS (SELECT 1 FROM ProductoVariante pv JOIN Inventario i ON i.variante = pv "
            + "WHERE pv.producto = p AND i.ubicacionArea.idUbicacionArea = :idUbicacionArea) "
            + "AND (LOWER(p.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "OR LOWER(p.codigoIdentificacion) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "OR LOWER(p.codigoBarras) LIKE LOWER(CONCAT('%', :busqueda, '%'))) "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosConStockEnUbicacionAreaConBusqueda(
            @Param("idUbicacionArea") Long idUbicacionArea,
            @Param("busqueda") String busqueda,
            Pageable pageable);

    @Query("SELECT DISTINCT p FROM Producto p "
            + "WHERE EXISTS (SELECT 1 FROM ProductoVariante pv JOIN Inventario i ON i.variante = pv "
            + "JOIN i.ubicacionArea ua JOIN ua.area a JOIN ua.ubicacion u "
            + "WHERE pv.producto = p "
            + "AND LOWER(TRIM(u.nombre)) IN ('almacén', 'almacen') AND a.idArea = :idAreaCatalogo) "
            + "AND (LOWER(p.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "OR LOWER(p.codigoIdentificacion) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "OR LOWER(p.codigoBarras) LIKE LOWER(CONCAT('%', :busqueda, '%'))) "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosConStockEnSectorAlmacenConBusqueda(
            @Param("idAreaCatalogo") Long idAreaCatalogo,
            @Param("busqueda") String busqueda,
            Pageable pageable);

    // Paginación con búsqueda opcional por nombre, código de identificación o código de barras
    @Query("SELECT DISTINCT p FROM Producto p "
            + "LEFT JOIN FETCH p.categoria "
            + "LEFT JOIN FETCH p.subCategoria2 "
            + "LEFT JOIN FETCH p.categoriaPadre "
            + "LEFT JOIN FETCH p.proveedor "
            + "WHERE (p.codigoIdentificacion = :busqueda "
            + "   OR p.codigoBarras = :busqueda "
            + "   OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "   OR LOWER(p.codigoIdentificacion) LIKE LOWER(CONCAT('%', :busqueda, '%')) "
            + "   OR LOWER(p.codigoBarras) LIKE LOWER(CONCAT('%', :busqueda, '%'))) "
            + "ORDER BY p.idProducto DESC")
    Page<Producto> findProductosPaginadosConBusqueda(@Param("busqueda") String busqueda, Pageable pageable);
}
