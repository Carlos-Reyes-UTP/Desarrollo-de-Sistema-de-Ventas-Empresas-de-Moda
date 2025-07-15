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
                     "c.id, " +
                     "c.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN p2.categoria c2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE c2.id = c.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN p3.categoria c3 " +
                     " JOIN dv3.venta v3 " +
                     " WHERE c3.id = c.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN dv.venta v " +
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin AND c.categoriaPadre IS NULL " +
                     "GROUP BY c.id, c.nombre " +
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
                     "c.id, " +
                     "c.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN p2.categoria c2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE c2.id = c.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN p3.categoria c3 " +
                     " JOIN dv3.venta v3 " +
                     " WHERE c3.id = c.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN dv.venta v " +
                     "WHERE c.categoriaPadre.id = :idCategoriaPadre AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY c.id, c.nombre " +
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
                     "c.id, " +
                     "c.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN p2.categoria c2 " +
                     " JOIN dv2.venta v2 " +
                     " WHERE c2.id = c.id AND v2.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN p3.categoria c3 " +
                     " JOIN dv3.venta v3 " +
                     " WHERE c3.id = c.id AND v3.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN dv.venta v " +
                     "WHERE c.categoriaPadre.id = :idSubcategoria AND v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY c.id, c.nombre " +
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

       // Consulta para obtener las tallas disponibles de un producto específico
       @Query("SELECT new com.tienda.ropa.dto.TallaProductoDTO(" +
                     "t.idTalla, " +
                     "t.nombreTalla, " +
                     "COUNT(pv.idProductoVariante)) " +
                     "FROM ProductoVariante pv " +
                     "JOIN pv.talla t " +
                     "WHERE pv.producto.id = :idProducto " +
                     "GROUP BY t.idTalla, t.nombreTalla " +
                     "ORDER BY t.nombreTalla")
       List<TallaProductoDTO> findTallasByProductoId(@Param("idProducto") Long idProducto);

       // Consulta para obtener variantes agrupadas por color para un producto y talla específicos
       @Query("SELECT new com.tienda.ropa.dto.VariantesPorColorDTO(" +
                     "c.idColor, " +
                     "c.nombre, " +
                     "c.codigoHex, " +
                     "SUM(pv.cantidad), " +
                     "COALESCE(SUM(dv.cantidad), 0), " +
                     "COALESCE(SUM(dv.precioUnitario * dv.cantidad), 0)) " +
                     "FROM ProductoVariante pv " +
                     "JOIN pv.color c " +
                     "LEFT JOIN DetalleVenta dv ON dv.productoVariante.idProductoVariante = pv.idProductoVariante " +
                     "WHERE pv.producto.id = :idProducto AND pv.talla.idTalla = :idTalla " +
                     "GROUP BY c.idColor, c.nombre, c.codigoHex " +
                     "ORDER BY c.nombre")
       List<VariantesPorColorDTO> findVariantesPorColorByProductoAndTalla(
                     @Param("idProducto") Long idProducto, 
                     @Param("idTalla") Long idTalla);
}
