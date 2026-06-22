package com.tienda.ropa.repository;

import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

    List<Solicitud> findByUsuario_IdAndFechaCreacionBetweenOrderByFechaCreacionDesc(
            Long idUsuario,
            Instant desde,
            Instant hasta);

    @Query("""
            SELECT DISTINCT s FROM Solicitud s
            LEFT JOIN FETCH s.usuario
            JOIN FETCH s.ubicacionAreaOrigen orig JOIN FETCH orig.ubicacion JOIN FETCH orig.area
            JOIN FETCH s.ubicacionAreaDestino dest JOIN FETCH dest.ubicacion JOIN FETCH dest.area
            LEFT JOIN FETCH s.detalles det
            LEFT JOIN FETCH det.variante v
            LEFT JOIN FETCH v.producto p
            WHERE s.estado = :estado
            ORDER BY s.fechaCreacion ASC
            """)
    List<Solicitud> findColaPendientesConDetalles(@Param("estado") EstadoSolicitud estado);

    @Query("""
            SELECT DISTINCT s FROM Solicitud s
            LEFT JOIN FETCH s.usuario
            JOIN FETCH s.ubicacionAreaOrigen orig JOIN FETCH orig.ubicacion JOIN FETCH orig.area
            JOIN FETCH s.ubicacionAreaDestino dest JOIN FETCH dest.ubicacion JOIN FETCH dest.area
            LEFT JOIN FETCH s.detalles det
            LEFT JOIN FETCH det.variante v
            LEFT JOIN FETCH v.producto p
            WHERE s.estado = :estado
              AND orig.area.idArea = :idAreaCatalogo
            ORDER BY s.fechaCreacion ASC
            """)
    List<Solicitud> findColaPendientesConDetallesPorAreaOrigen(
            @Param("estado") EstadoSolicitud estado,
            @Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("""
            SELECT s FROM Solicitud s
            JOIN FETCH s.ubicacionAreaOrigen orig JOIN FETCH orig.ubicacion JOIN FETCH orig.area
            JOIN FETCH s.ubicacionAreaDestino dest
            WHERE s.idSolicitud = :id
            """)
    Optional<Solicitud> findByIdWithUbicaciones(@Param("id") Long id);

    @Query("SELECT s FROM Solicitud s LEFT JOIN FETCH s.usuario WHERE s.idSolicitud = :id")
    Optional<Solicitud> findByIdWithUsuario(@Param("id") Long id);

    List<Solicitud> findByEstadoAndTipoSolicitudAndFechaCreacionBefore(
            EstadoSolicitud estado,
            com.tienda.ropa.entity.TipoSolicitud tipoSolicitud,
            Instant fechaLimite);

    @Query("""
            SELECT DISTINCT s FROM Solicitud s
            LEFT JOIN FETCH s.detalles d
            LEFT JOIN FETCH d.variante v
            LEFT JOIN FETCH v.producto
            WHERE s.usuario.id = :idUsuario
              AND s.fechaCreacion BETWEEN :desde AND :hasta
            ORDER BY s.fechaCreacion DESC
            """)
    List<Solicitud> findMisSolicitudesConDetalles(
            @Param("idUsuario") Long idUsuario,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta);

    @Query("""
            SELECT DISTINCT s FROM Solicitud s
            LEFT JOIN FETCH s.usuario
            JOIN FETCH s.ubicacionAreaOrigen orig
            JOIN FETCH orig.ubicacion
            JOIN FETCH orig.area
            JOIN FETCH s.ubicacionAreaDestino dest
            JOIN FETCH dest.ubicacion
            JOIN FETCH dest.area
            LEFT JOIN FETCH s.detalles det
            LEFT JOIN FETCH det.variante v
            LEFT JOIN FETCH v.producto p
            WHERE s.estado IN :estados
              AND s.fechaCreacion >= :desde
              AND s.fechaCreacion < :hasta
              AND (:idArea IS NULL OR orig.area.idArea = :idArea)
              AND (:tipoSolicitud IS NULL OR s.tipoSolicitud = :tipoSolicitud)
            ORDER BY s.fechaCreacion DESC
            """)
    List<Solicitud> findHistorialConFiltros(
            @Param("estados") List<EstadoSolicitud> estados,
            @Param("desde") Instant desde,
            @Param("hasta") Instant hasta,
            @Param("idArea") Long idArea,
            @Param("tipoSolicitud") com.tienda.ropa.entity.TipoSolicitud tipoSolicitud);
}
