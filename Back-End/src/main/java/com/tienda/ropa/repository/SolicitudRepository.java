package com.tienda.ropa.repository;

import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

    List<Solicitud> findByUsuario_IdAndFechaCreacionBetweenOrderByFechaCreacionDesc(
            Long idUsuario,
            Instant desde,
            Instant hasta);

    @Query("""
            SELECT DISTINCT s FROM Solicitud s
            LEFT JOIN FETCH s.usuario
            JOIN FETCH s.ubicacionOrigen
            JOIN FETCH s.ubicacionDestino
            LEFT JOIN FETCH s.detalles d
            LEFT JOIN FETCH d.variante v
            LEFT JOIN FETCH v.producto p
            WHERE s.estado = :estado
            ORDER BY s.fechaCreacion ASC
            """)
    List<Solicitud> findColaPendientesConDetalles(@Param("estado") EstadoSolicitud estado);
}
