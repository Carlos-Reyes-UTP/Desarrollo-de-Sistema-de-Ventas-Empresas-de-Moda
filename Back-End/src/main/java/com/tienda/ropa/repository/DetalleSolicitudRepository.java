package com.tienda.ropa.repository;

import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DetalleSolicitudRepository extends JpaRepository<DetalleSolicitud, Long> {

    List<DetalleSolicitud> findBySolicitud_IdSolicitud(Long idSolicitud);

    boolean existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_Estado(
            Long idVariante, TipoSolicitud tipoSolicitud, EstadoSolicitud estado);

    /**
     * Suma cantidades reservadas (solicitudes VENTA PENDIENTE) para una variante en la misma línea de catálogo
     * que el área origen de almacén (id_area del sector origen).
     */
    @Query("""
            SELECT COALESCE(SUM(d.cantidad), 0) FROM DetalleSolicitud d
            JOIN d.solicitud s
            JOIN s.ubicacionAreaOrigen orig
            JOIN orig.area origArea
            WHERE d.variante.idProductoVariante = :idVariante
              AND s.estado = com.tienda.ropa.entity.EstadoSolicitud.PENDIENTE
              AND s.tipoSolicitud = com.tienda.ropa.entity.TipoSolicitud.VENTA
              AND origArea.idArea = :idAreaCatalogo
            """)
    int sumCantidadReservadaPendienteVentaEnLinea(
            @Param("idVariante") Long idVariante,
            @Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("""
            SELECT COALESCE(SUM(d.cantidad), 0) FROM DetalleSolicitud d
            JOIN d.solicitud s
            WHERE d.variante.idProductoVariante = :idVariante
              AND s.estado = com.tienda.ropa.entity.EstadoSolicitud.PENDIENTE
              AND s.tipoSolicitud = com.tienda.ropa.entity.TipoSolicitud.VENTA
            """)
    int sumCantidadReservadaPendienteVentaTotal(@Param("idVariante") Long idVariante);

    @Query("""
            SELECT d.variante.idProductoVariante, COALESCE(SUM(d.cantidad), 0)
            FROM DetalleSolicitud d
            JOIN d.solicitud s
            JOIN s.ubicacionAreaOrigen orig
            JOIN orig.area origArea
            WHERE d.variante.idProductoVariante IN :idsVariante
              AND s.estado = com.tienda.ropa.entity.EstadoSolicitud.PENDIENTE
              AND s.tipoSolicitud = com.tienda.ropa.entity.TipoSolicitud.VENTA
              AND origArea.idArea = :idAreaCatalogo
            GROUP BY d.variante.idProductoVariante
            """)
    List<Object[]> sumReservadoPendienteVentaPorVariantesEnLinea(
            @Param("idsVariante") List<Long> idsVariante,
            @Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("""
            SELECT d.variante.idProductoVariante, COALESCE(SUM(d.cantidad), 0)
            FROM DetalleSolicitud d
            JOIN d.solicitud s
            WHERE d.variante.idProductoVariante IN :idsVariante
              AND s.estado = com.tienda.ropa.entity.EstadoSolicitud.PENDIENTE
              AND s.tipoSolicitud = com.tienda.ropa.entity.TipoSolicitud.VENTA
            GROUP BY d.variante.idProductoVariante
            """)
    List<Object[]> sumReservadoPendienteVentaPorVariantesTotal(@Param("idsVariante") List<Long> idsVariante);
}
