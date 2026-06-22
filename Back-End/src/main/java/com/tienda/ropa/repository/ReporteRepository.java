package com.tienda.ropa.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tienda.ropa.dto.ProductoMasVendidoDTO;
import com.tienda.ropa.dto.ReportePorCategoriaDTO;
import com.tienda.ropa.dto.TallaProductoDTO;
import com.tienda.ropa.dto.VariantesPorColorDTO;
import com.tienda.ropa.entity.DetalleVenta;

@Repository
public interface ReporteRepository extends JpaRepository<DetalleVenta, Long> {

       // Stock general: stock total por producto con desglose almacén / pisos de venta
       @Query(value = """
           SELECT
             p.id_producto,
             p.nombre,
             p.codigo_identificacion,
             COALESCE(cp.nombre, '') AS categoria,
             COALESCE(SUM(i.stock), 0) AS stock_total,
             COALESCE(SUM(CASE WHEN LOWER(TRIM(u.nombre)) IN ('almacén','almacen','bodega','depósito','deposito') THEN i.stock ELSE 0 END), 0) AS stock_almacen
           FROM producto p
           LEFT JOIN producto_variante pv ON p.id_producto = pv.id_producto
           LEFT JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
           LEFT JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
           LEFT JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
           LEFT JOIN categoria cp ON cp.id_categoria = p.id_categoria_padre
           GROUP BY p.id_producto, p.nombre, p.codigo_identificacion, cp.nombre
           ORDER BY p.nombre
           """, nativeQuery = true)
       List<Object[]> findStockGeneral();

       // Stock por variante de un producto con desglose almacén / pisos de venta
       @Query(value = """
           SELECT
             pv.id_producto_variante,
             COALESCE(pv.color, '') AS color,
             COALESCE(pv.talla, '') AS talla,
             COALESCE(SUM(i.stock), 0) AS stock_total,
             COALESCE(SUM(CASE WHEN LOWER(TRIM(u.nombre)) IN ('almacén','almacen','bodega','depósito','deposito') THEN i.stock ELSE 0 END), 0) AS stock_almacen
           FROM producto_variante pv
           LEFT JOIN inventario i ON i.id_producto_variante = pv.id_producto_variante
           LEFT JOIN ubicacion_area ua ON ua.id_ubicacion_area = i.id_ubicacion_area
           LEFT JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
           WHERE pv.id_producto = :idProducto
           GROUP BY pv.id_producto_variante, pv.color, pv.talla
           ORDER BY pv.color, pv.talla
           """, nativeQuery = true)
       List<Object[]> findStockVariantesByProducto(@Param("idProducto") Long idProducto);


       // Consulta para productos más vendidos
       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COALESCE(cp.nombre, ''), " +
                     "COALESCE(c.nombre, ''), " +
                     "COALESCE(sc2.nombre, ''), " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "LEFT JOIN p.categoriaPadre cp " +
                     "LEFT JOIN p.categoria c " +
                     "LEFT JOIN p.subCategoria2 sc2 " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, cp.nombre, c.nombre, sc2.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidos(Pageable pageable);

       // Consulta para productos más vendidos por fecha
       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COALESCE(cp.nombre, ''), " +
                     "COALESCE(c.nombre, ''), " +
                     "COALESCE(sc2.nombre, ''), " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "LEFT JOIN p.categoriaPadre cp " +
                     "LEFT JOIN p.categoria c " +
                     "LEFT JOIN p.subCategoria2 sc2 " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, cp.nombre, c.nombre, sc2.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidosPorFecha(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin,
                     Pageable pageable);

       // Consulta para reporte por categoría principal (agrupando por categoriaPadre del producto)
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.categoriaPadre.id, " +
                     "p.categoriaPadre.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " WHERE p2.categoriaPadre.id = p.categoriaPadre.id " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                      " JOIN dv3.productoVariante pv3 " +
                      " JOIN pv3.producto p3 " +
                      " WHERE p3.categoriaPadre.id = p.categoriaPadre.id " +
                      " GROUP BY p3.id " +
                      " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                      "FROM DetalleVenta dv " +
                      "JOIN dv.productoVariante pv " +
                      "JOIN pv.producto p " +
                      "WHERE p.categoriaPadre IS NOT NULL " +
                     "GROUP BY p.categoriaPadre.id, p.categoriaPadre.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorCategoria();

       // Consulta para reporte por categoría con fechas
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.categoriaPadre.id, " +
                     "p.categoriaPadre.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE p2.categoriaPadre.id = p.categoriaPadre.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                      " JOIN dv3.productoVariante pv3 " +
                      " JOIN pv3.producto p3 " +
                      " JOIN dv3.venta v3 " +
                      " WHERE p3.categoriaPadre.id = p.categoriaPadre.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                      " GROUP BY p3.id " +
                      " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                      "FROM DetalleVenta dv " +
                      "JOIN dv.productoVariante pv " +
                      "JOIN pv.producto p " +
                      "JOIN dv.venta v " +
                      "WHERE p.categoriaPadre IS NOT NULL AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY p.categoriaPadre.id, p.categoriaPadre.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorCategoriaEntreFechas(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       // Consultas para reportes por subcategoría (drill-down nivel 1)
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.categoria.id, " +
                     "p.categoria.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " WHERE p2.categoria.id = p.categoria.id " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " WHERE p3.categoria.id = p.categoria.id " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "WHERE p.categoriaPadre.id = :idCategoriaPadre AND p.categoria IS NOT NULL " +
                     "GROUP BY p.categoria.id, p.categoria.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorSubcategoria(@Param("idCategoriaPadre") Long idCategoriaPadre);

       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.categoria.id, " +
                     "p.categoria.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE p2.categoria.id = p.categoria.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN dv3.venta v3 " +
                     " WHERE p3.categoria.id = p.categoria.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN dv.venta v " +
                     "WHERE p.categoriaPadre.id = :idCategoriaPadre AND p.categoria IS NOT NULL AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY p.categoria.id, p.categoria.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorSubcategoriaEntreFechas(
                     @Param("idCategoriaPadre") Long idCategoriaPadre,
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       // Consultas para reportes por segunda subcategoría (drill-down nivel 2)
       // Consultas para reportes por segunda subcategoría (drill-down nivel 2)
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.subCategoria2.id, " +
                     "p.subCategoria2.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " WHERE p2.subCategoria2.id = p.subCategoria2.id " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " WHERE p3.subCategoria2.id = p.subCategoria2.id " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "WHERE p.categoria.id = :idSubcategoria AND p.subCategoria2 IS NOT NULL " +
                     "GROUP BY p.subCategoria2.id, p.subCategoria2.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorSegundaSubcategoria(@Param("idSubcategoria") Long idSubcategoria);

       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "p.subCategoria2.id, " +
                     "p.subCategoria2.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE p2.subCategoria2.id = p.subCategoria2.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN dv3.venta v3 " +
                     " WHERE p3.subCategoria2.id = p.subCategoria2.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN dv.venta v " +
                     "WHERE p.categoria.id = :idSubcategoria AND p.subCategoria2 IS NOT NULL AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY p.subCategoria2.id, p.subCategoria2.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorSegundaSubcategoriaEntreFechas(
                     @Param("idSubcategoria") Long idSubcategoria,
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COALESCE(cp.nombre, ''), " +
                     "COALESCE(c.nombre, ''), " +
                     "COALESCE(sc2.nombre, ''), " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "LEFT JOIN p.categoriaPadre cp " +
                     "LEFT JOIN p.categoria c " +
                     "LEFT JOIN p.subCategoria2 sc2 " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "WHERE cp.idCategoria = :idCategoriaPadre " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, cp.nombre, c.nombre, sc2.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidosPorCategoriaPadre(
                     @Param("idCategoriaPadre") Long idCategoriaPadre, Pageable pageable);

       // Consulta para productos más vendidos por categoría padre y fecha
       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COALESCE(cp.nombre, ''), " +
                     "COALESCE(c.nombre, ''), " +
                     "COALESCE(sc2.nombre, ''), " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "LEFT JOIN p.categoriaPadre cp " +
                     "LEFT JOIN p.categoria c " +
                     "LEFT JOIN p.subCategoria2 sc2 " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "WHERE cp.idCategoria = :idCategoriaPadre AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, cp.nombre, c.nombre, sc2.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidosPorCategoriaPadreYFecha(
                     @Param("idCategoriaPadre") Long idCategoriaPadre, 
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin,
                     Pageable pageable);

       // Tallas distintas (texto) presentes en variantes del producto
       @Query("SELECT new com.tienda.ropa.dto.TallaProductoDTO(" +
                     "0L, " +
                     "pv.talla, " +
                     "COUNT(pv.idProductoVariante)) " +
                     "FROM ProductoVariante pv " +
                     "WHERE pv.producto.idProducto = :idProducto " +
                     "GROUP BY pv.talla " +
                     "ORDER BY pv.talla")
       List<TallaProductoDTO> findTallasByProductoId(@Param("idProducto") Long idProducto);

       // Variantes agrupadas por color (texto) para un producto y talla (texto) sin fechas
       @Query("SELECT new com.tienda.ropa.dto.VariantesPorColorDTO(" +
                     "0L, " +
                     "pv.color, " +
                     "'', " +
                     "COALESCE(SUM(dv.cantidad), 0), " +
                     "COALESCE(SUM(dv.precioUnitario * dv.cantidad), 0)) " +
                     "FROM ProductoVariante pv " +
                     "LEFT JOIN DetalleVenta dv ON dv.productoVariante.idProductoVariante = pv.idProductoVariante " +
                     "WHERE pv.producto.idProducto = :idProducto AND LOWER(pv.talla) = LOWER(:nombreTalla) " +
                     "GROUP BY pv.color " +
                     "ORDER BY pv.color")
       List<VariantesPorColorDTO> findVariantesPorColorByProductoAndTalla(
                     @Param("idProducto") Long idProducto,
                     @Param("nombreTalla") String nombreTalla);

       // Variantes agrupadas por color (texto) para un producto y talla (texto) con fechas
       @Query("SELECT new com.tienda.ropa.dto.VariantesPorColorDTO(" +
                     "0L, " +
                     "pv.color, " +
                     "'', " +
                     "COALESCE(SUM(dv.cantidad), 0), " +
                     "COALESCE(SUM(dv.precioUnitario * dv.cantidad), 0)) " +
                     "FROM ProductoVariante pv " +
                     "LEFT JOIN DetalleVenta dv ON dv.productoVariante.idProductoVariante = pv.idProductoVariante " +
                     "LEFT JOIN dv.venta v " +
                     "WHERE pv.producto.idProducto = :idProducto AND LOWER(pv.talla) = LOWER(:nombreTalla) " +
                     "AND (v IS NULL OR v.fechaVenta BETWEEN :fechaInicio AND :fechaFin) " +
                     "GROUP BY pv.color " +
                     "ORDER BY pv.color")
       List<VariantesPorColorDTO> findVariantesPorColorByProductoAndTallaEntreFechas(
                     @Param("idProducto") Long idProducto,
                     @Param("nombreTalla") String nombreTalla,
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);
}
