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
import com.tienda.ropa.dto.ReportePorColorDTO;
import com.tienda.ropa.dto.ReportePorTallaDTO;
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
                     "c.nombre, " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, c.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidos(Pageable pageable);

       // Consulta para productos más vendidos por fecha
       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "c.nombre, " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, c.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidosPorFecha(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin,
                     Pageable pageable);

       // Consulta para reporte por categoría
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
                     "c.nombre, " +
                     "COUNT(DISTINCT p.id), " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "(SELECT p2.nombre FROM DetalleVenta dv2 " +
                     " JOIN dv2.productoVariante pv2 " +
                     " JOIN pv2.producto p2 " +
                     " JOIN p2.categoria c2 " +
                     " WHERE c2.id = c.id " +
                     " GROUP BY p2.id, p2.nombre " +
                     " ORDER BY SUM(dv2.cantidad) DESC LIMIT 1), " +
                     "(SELECT SUM(dv3.cantidad) FROM DetalleVenta dv3 " +
                     " JOIN dv3.productoVariante pv3 " +
                     " JOIN pv3.producto p3 " +
                     " JOIN p3.categoria c3 " +
                     " WHERE c3.id = c.id " +
                     " GROUP BY p3.id " +
                     " ORDER BY SUM(dv3.cantidad) DESC LIMIT 1)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "GROUP BY c.id, c.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorCategoria();

       // Consulta para reporte por categoría con fechas
       @Query("SELECT new com.tienda.ropa.dto.ReportePorCategoriaDTO(" +
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
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY c.id, c.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorCategoriaDTO> findReportePorCategoriaEntreFechas(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       // Consulta para reporte por color
       @Query("SELECT new com.tienda.ropa.dto.ReportePorColorDTO(" +
                     "col.nombre, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COUNT(DISTINCT p.id)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN pv.color col " +
                     "GROUP BY col.id, col.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorColorDTO> findReportePorColor();

       // Consulta para reporte por color con fechas
       @Query("SELECT new com.tienda.ropa.dto.ReportePorColorDTO(" +
                     "col.nombre, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COUNT(DISTINCT p.id)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN pv.color col " +
                     "JOIN dv.venta v " +
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY col.id, col.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorColorDTO> findReportePorColorEntreFechas(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       // Consulta para reporte por talla
       @Query("SELECT new com.tienda.ropa.dto.ReportePorTallaDTO(" +
                     "t.nombreTalla, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COUNT(DISTINCT p.id), " +
                     "AVG(dv.precioUnitario)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN pv.talla t " +
                     "GROUP BY t.id, t.nombreTalla " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorTallaDTO> findReportePorTalla();

       // Consulta para reporte por talla con fechas
       @Query("SELECT new com.tienda.ropa.dto.ReportePorTallaDTO(" +
                     "t.nombreTalla, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "COUNT(DISTINCT p.id), " +
                     "AVG(dv.precioUnitario)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN pv.talla t " +
                     "JOIN dv.venta v " +
                     "WHERE v.fechaVenta BETWEEN :fechaInicio AND :fechaFin " +
                     "GROUP BY t.id, t.nombreTalla " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ReportePorTallaDTO> findReportePorTallaEntreFechas(
                     @Param("fechaInicio") LocalDateTime fechaInicio,
                     @Param("fechaFin") LocalDateTime fechaFin);

       @Query("SELECT new com.tienda.ropa.dto.ProductoMasVendidoDTO(" +
                     "pv.producto.id, " +
                     "p.nombre, " +
                     "p.codigoIdentificacion, " +
                     "SUM(dv.cantidad), " +
                     "SUM(dv.precioUnitario * dv.cantidad), " +
                     "c.nombre, " +
                     "prov.nombre, " +
                     "AVG(dv.precioUnitario), " +
                     "MAX(v.fechaVenta)) " +
                     "FROM DetalleVenta dv " +
                     "JOIN dv.productoVariante pv " +
                     "JOIN pv.producto p " +
                     "JOIN p.categoria c " +
                     "JOIN p.categoriaPadre cp " +
                     "JOIN p.proveedor prov " +
                     "JOIN dv.venta v " +
                     "WHERE cp.idCategoria = :idCategoriaPadre " +
                     "GROUP BY pv.producto.id, p.nombre, p.codigoIdentificacion, c.nombre, prov.nombre " +
                     "ORDER BY SUM(dv.cantidad) DESC")
       List<ProductoMasVendidoDTO> findProductosMasVendidosPorCategoriaPadre(
                     @Param("idCategoriaPadre") Long idCategoriaPadre, Pageable pageable);
}
