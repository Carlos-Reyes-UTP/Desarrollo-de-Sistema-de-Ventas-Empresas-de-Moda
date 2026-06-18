package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;

@Repository
public interface ProductoVarianteRepository extends JpaRepository<ProductoVariante, Long> {

    @EntityGraph(attributePaths = {"inventarios", "inventarios.ubicacionArea", "inventarios.ubicacionArea.ubicacion", "inventarios.ubicacionArea.area"})
    @Query("SELECT DISTINCT pv FROM ProductoVariante pv WHERE pv.producto = :producto")
    List<ProductoVariante> findByProductoWithInventarios(@Param("producto") Producto producto);

    List<ProductoVariante> findByProducto(Producto producto);

    List<ProductoVariante> findByProducto_IdProductoAndTallaIgnoreCase(Long idProducto, String talla);

    List<ProductoVariante> findByProducto_IdProductoAndColorIgnoreCase(Long idProducto, String color);

    Optional<ProductoVariante> findByProducto_IdProductoAndTallaIgnoreCaseAndColorIgnoreCase(
            Long idProducto, String talla, String color);

    Optional<ProductoVariante> findByCodigoBarras(String codigoBarras);

    @Query("SELECT SUM(pv.cantidad) FROM ProductoVariante pv WHERE pv.producto.idProducto = :idProducto")
    Integer getTotalCantidadByProducto(Long idProducto);

    @Query("SELECT DISTINCT pv.talla FROM ProductoVariante pv "
            + "WHERE pv.talla IS NOT NULL AND TRIM(pv.talla) <> '' ORDER BY pv.talla")
    List<String> findDistinctTallas();

    @Query("SELECT DISTINCT pv.color FROM ProductoVariante pv "
            + "WHERE pv.color IS NOT NULL AND TRIM(pv.color) <> '' ORDER BY pv.color")
    List<String> findDistinctColores();

    List<ProductoVariante> findByProducto_IdProducto(Long idProducto);

    String VARIANTE_CAJERO_FROM = """
            FROM producto_variante pv
            INNER JOIN producto p ON p.id_producto = pv.id_producto
            LEFT JOIN categoria cat ON cat.id_categoria = p.id_subcategoria
            LEFT JOIN categoria cat2 ON cat2.id_categoria = p.id_sub_categoria2
            LEFT JOIN (
              SELECT id_producto_variante, COALESCE(SUM(stock), 0) AS stock_total
              FROM inventario
              GROUP BY id_producto_variante
            ) inv ON inv.id_producto_variante = pv.id_producto_variante
            INNER JOIN (
              SELECT i.id_producto_variante, SUM(i.stock) AS stock_piso
              FROM inventario i
              INNER JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
              INNER JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
              WHERE LOWER(TRIM(u.nombre)) NOT IN ('almacen', 'almacén', 'bodega', 'depósito', 'deposito')
              GROUP BY i.id_producto_variante
              HAVING SUM(i.stock) > 0
            ) inv_piso ON inv_piso.id_producto_variante = pv.id_producto_variante
            """;

    String VARIANTE_CAJERO_SELECT = """
            SELECT
              pv.id_producto_variante,
              COALESCE(pv.codigo_barras, ''),
              COALESCE(inv_piso.stock_piso, 0),
              p.id_producto,
              p.nombre,
              p.sexo,
              p.tipo_publico,
              p.codigo_identificacion,
              p.precio_unitario,
              0,
              pv.talla,
              0,
              pv.color,
              COALESCE(cat.nombre, ''),
              COALESCE(cat2.nombre, ''),
              COALESCE(pv.sku, ''),
              COALESCE(inv_piso.stock_piso, 0)
            """
            + VARIANTE_CAJERO_FROM;

    String VARIANTE_CAJERO_COUNT_BASE = """
            SELECT COUNT(*)
            FROM producto_variante pv
            INNER JOIN producto p ON p.id_producto = pv.id_producto
            INNER JOIN (
              SELECT i.id_producto_variante
              FROM inventario i
              INNER JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
              INNER JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
              WHERE LOWER(TRIM(u.nombre)) NOT IN ('almacen', 'almacén', 'bodega', 'depósito', 'deposito')
              GROUP BY i.id_producto_variante
              HAVING SUM(i.stock) > 0
            ) inv_piso ON inv_piso.id_producto_variante = pv.id_producto_variante
            """;

    @Query(nativeQuery = true,
            value = VARIANTE_CAJERO_SELECT + " ORDER BY pv.id_producto_variante DESC",
            countQuery = VARIANTE_CAJERO_COUNT_BASE)
    Page<Object[]> findVariantesPaginadasSinBusqueda(Pageable pageable);

    @Query(nativeQuery = true,
            value = VARIANTE_CAJERO_SELECT
                    + """
                    WHERE (
                      :busqueda IS NULL OR :busqueda = '' OR
                      pv.codigo_barras ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.sku ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.color ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.talla ILIKE CONCAT('%', :busqueda, '%') OR
                      p.codigo_identificacion ILIKE CONCAT('%', :busqueda, '%') OR
                      p.nombre ILIKE CONCAT('%', :busqueda, '%')
                    )
                    ORDER BY pv.id_producto_variante DESC
                    """,
            countQuery = VARIANTE_CAJERO_COUNT_BASE
                    + """
                    WHERE (
                      :busqueda IS NULL OR :busqueda = '' OR
                      pv.codigo_barras ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.sku ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.color ILIKE CONCAT('%', :busqueda, '%') OR
                      pv.talla ILIKE CONCAT('%', :busqueda, '%') OR
                      p.codigo_identificacion ILIKE CONCAT('%', :busqueda, '%') OR
                      p.nombre ILIKE CONCAT('%', :busqueda, '%')
                    )
                    """)
    Page<Object[]> findVariantesPaginadasConBusqueda(@Param("busqueda") String busqueda, Pageable pageable);

    @Query(nativeQuery = true, value = VARIANTE_CAJERO_SELECT + " ORDER BY pv.id_producto_variante DESC")
    List<Object[]> findAllVariantesConInformacionCompleta();

    String VARIANTE_EXPORTAR_SELECT = """
            SELECT
              pv.id_producto_variante,
              p.codigo_identificacion,
              p.nombre,
              pv.talla,
              pv.color,
              COALESCE(pr.nombre, ''),
              p.precio_unitario,
              COALESCE(p.precio_cuarto, 0),
              COALESCE(p.precio_media_docena, 0),
              COALESCE(p.precio_docena, 0)
            FROM producto_variante pv
            INNER JOIN producto p ON p.id_producto = pv.id_producto
            LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
            """;

    @Query(nativeQuery = true, value = VARIANTE_EXPORTAR_SELECT + " ORDER BY pv.id_producto_variante")
    List<Object[]> findExportarTodo();

    @Query(nativeQuery = true, value = VARIANTE_EXPORTAR_SELECT
            + """
            INNER JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
            INNER JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
            INNER JOIN area a ON a.id_area = ua.id_area
            WHERE LOWER(TRIM(a.nombre)) = LOWER(TRIM(:area))
            ORDER BY pv.id_producto_variante
            """)
    List<Object[]> findExportarPorArea(@Param("area") String area);
}
