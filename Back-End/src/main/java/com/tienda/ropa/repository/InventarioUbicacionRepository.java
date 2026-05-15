package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tienda.ropa.entity.InventarioUbicacion;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Ubicacion;

public interface InventarioUbicacionRepository extends JpaRepository<InventarioUbicacion, Long> {

    List<InventarioUbicacion> findByVariante_IdProductoVariante(Long idVariante);

    Optional<InventarioUbicacion> findByVarianteAndUbicacion(ProductoVariante variante, Ubicacion ubicacion);

    Optional<InventarioUbicacion> findByVariante_IdProductoVarianteAndUbicacion_IdUbicacion(Long idVariante, Long idUbicacion);

    @Query("SELECT COALESCE(SUM(i.stockActual), 0) FROM InventarioUbicacion i WHERE i.variante.idProductoVariante = :idVariante")
    int sumStockByVariante(@Param("idVariante") Long idVariante);

    /**
     * Devuelve las filas con stock positivo para una variante, excluyendo la ubicación Almacén.
     * Usado para resolver el "área de venta" cuando se asume que una variante solo existe en un área.
     */
    @Query("SELECT i FROM InventarioUbicacion i "
            + "JOIN FETCH i.ubicacion u "
            + "WHERE i.variante.idProductoVariante = :idVariante "
            + "AND COALESCE(i.stockActual, 0) > 0 "
            + "AND LOWER(u.nombre) <> LOWER(:nombreAlmacen)")
    List<InventarioUbicacion> findConStockPositivoExcluyendoUbicacion(
            @Param("idVariante") Long idVariante,
            @Param("nombreAlmacen") String nombreAlmacen);

    @Query("SELECT i FROM InventarioUbicacion i " +
            "JOIN FETCH i.variante v JOIN FETCH v.producto " +
            "WHERE i.ubicacion.idUbicacion = :idUbicacion AND i.stockActual > 0 " +
            "ORDER BY v.producto.nombre, v.color, v.talla")
    List<InventarioUbicacion> findStockPositivoByUbicacion(@Param("idUbicacion") Long idUbicacion);

    /**
     * Stock en Almacén para el modal de traslado; opcional filtro de texto sobre producto/variante.
     */
    @Query("SELECT i FROM InventarioUbicacion i "
            + "JOIN FETCH i.variante v JOIN FETCH v.producto p "
            + "WHERE i.ubicacion.idUbicacion IN :idsUbicacion AND i.stockActual > 0 AND "
            + "(:sinFiltro = true OR "
            + "LOWER(COALESCE(p.nombre, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(p.codigoIdentificacion, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.sku, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.color, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.talla, '')) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<InventarioUbicacion> findStockOrigenDistribucion(
            @Param("idsUbicacion") List<Long> idsUbicacion,
            @Param("sinFiltro") boolean sinFiltro,
            @Param("q") String q,
            Pageable pageable);
}
