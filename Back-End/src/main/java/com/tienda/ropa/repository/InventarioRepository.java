package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;

public interface InventarioRepository extends JpaRepository<Inventario, Long> {

    List<Inventario> findByVariante_IdProductoVariante(Long idVariante);

    Optional<Inventario> findByVarianteAndUbicacionArea(ProductoVariante variante, UbicacionArea ubicacionArea);

    Optional<Inventario> findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
            Long idVariante, Long idUbicacionArea);

    @Query("SELECT COALESCE(SUM(i.stock), 0) FROM Inventario i WHERE i.variante.idProductoVariante = :idVariante")
    int sumStockByVariante(@Param("idVariante") Long idVariante);

    @Query("SELECT COALESCE(SUM(i.stock), 0) FROM Inventario i WHERE i.variante.idProductoVariante IN :idsVariante")
    int sumStockByVariantes(@Param("idsVariante") List<Long> idsVariante);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.ubicacionArea ua JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE i.variante.idProductoVariante = :idVariante "
            + "AND COALESCE(i.stock, 0) > 0 "
            + "AND LOWER(TRIM(u.nombre)) NOT IN :nombresAlmacenLower")
    List<Inventario> findConStockPositivoExcluyendoAlmacen(
            @Param("idVariante") Long idVariante,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.variante v JOIN FETCH v.producto "
            + "WHERE i.ubicacionArea.idUbicacionArea = :idUbicacionArea AND i.stock > 0 "
            + "ORDER BY v.producto.nombre, v.color, v.talla")
    List<Inventario> findStockPositivoByUbicacionArea(@Param("idUbicacionArea") Long idUbicacionArea);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.variante v JOIN FETCH v.producto p "
            + "JOIN FETCH i.ubicacionArea ua JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE i.ubicacionArea.idUbicacionArea IN :idsUbicacionArea AND i.stock > 0 AND "
            + "(:sinFiltro = true OR "
            + "LOWER(COALESCE(p.nombre, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(p.codigoIdentificacion, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.sku, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.color, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(v.talla, '')) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Inventario> findStockOrigenDistribucion(
            @Param("idsUbicacionArea") List<Long> idsUbicacionArea,
            @Param("sinFiltro") boolean sinFiltro,
            @Param("q") String q,
            Pageable pageable);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.ubicacionArea ua JOIN FETCH ua.ubicacion JOIN FETCH ua.area "
            + "JOIN FETCH i.variante "
            + "WHERE i.variante.idProductoVariante IN :idsVariante")
    List<Inventario> findAllByVariantesIds(@Param("idsVariante") List<Long> idsVariante);

    @Query("SELECT COALESCE(SUM(i.stock), 0) FROM Inventario i "
            + "WHERE i.ubicacionArea.idUbicacionArea = :idUbicacionArea")
    int sumStockByUbicacionArea(@Param("idUbicacionArea") Long idUbicacionArea);

    @Query("SELECT COALESCE(SUM(i.stock), 0) FROM Inventario i "
            + "JOIN i.ubicacionArea ua JOIN ua.ubicacion u "
            + "WHERE i.variante.idProductoVariante = :idVariante "
            + "AND LOWER(TRIM(u.nombre)) IN :nombresAlmacenLower")
    int sumStockByVarianteEnAlmacen(
            @Param("idVariante") Long idVariante,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower);

    @Query("SELECT i.variante.idProductoVariante, COALESCE(SUM(i.stock), 0) FROM Inventario i "
            + "JOIN i.ubicacionArea ua JOIN ua.ubicacion u "
            + "WHERE i.variante.idProductoVariante IN :idsVariante "
            + "AND LOWER(TRIM(u.nombre)) IN :nombresAlmacenLower "
            + "GROUP BY i.variante.idProductoVariante")
    List<Object[]> sumStockByVariantesEnAlmacen(
            @Param("idsVariante") List<Long> idsVariante,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower);

    @Query("SELECT COUNT(DISTINCT i.variante.idProductoVariante) FROM Inventario i "
            + "WHERE i.ubicacionArea.idUbicacionArea = :idUbicacionArea AND COALESCE(i.stock, 0) > 0")
    int countVariantesConStockByUbicacionArea(@Param("idUbicacionArea") Long idUbicacionArea);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.variante v JOIN FETCH v.producto p "
            + "JOIN FETCH i.ubicacionArea ua JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE COALESCE(i.stock, 0) <= :umbral "
            + "AND LOWER(TRIM(u.nombre)) NOT IN :nombresAlmacenLower "
            + "ORDER BY p.nombre, v.color, v.talla")
    List<Inventario> findParaReposicion(
            @Param("umbral") int umbral,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower);

    @Query("SELECT i FROM Inventario i "
            + "JOIN FETCH i.variante v JOIN FETCH v.producto p "
            + "JOIN FETCH i.ubicacionArea ua JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE COALESCE(i.stock, 0) <= :umbral "
            + "AND LOWER(TRIM(u.nombre)) NOT IN :nombresAlmacenLower "
            + "AND a.idArea = :idAreaCatalogo "
            + "ORDER BY p.nombre, v.color, v.talla")
    List<Inventario> findParaReposicionPorLineaCatalogo(
            @Param("umbral") int umbral,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower,
            @Param("idAreaCatalogo") Long idAreaCatalogo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventario i "
            + "JOIN i.ubicacionArea ua JOIN ua.ubicacion u JOIN ua.area a "
            + "WHERE i.variante.idProductoVariante = :idVariante "
            + "AND LOWER(TRIM(u.nombre)) IN :nombresAlmacenLower "
            + "AND a.idArea = :idAreaCatalogo")
    List<Inventario> findFilasAlmacenLineaForUpdate(
            @Param("idVariante") Long idVariante,
            @Param("idAreaCatalogo") Long idAreaCatalogo,
            @Param("nombresAlmacenLower") List<String> nombresAlmacenLower);
}
