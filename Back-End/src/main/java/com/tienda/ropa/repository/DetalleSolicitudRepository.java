package com.tienda.ropa.repository;

import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DetalleSolicitudRepository extends JpaRepository<DetalleSolicitud, Long> {

    List<DetalleSolicitud> findBySolicitud_IdSolicitud(Long idSolicitud);

    boolean existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_Estado(
            Long idVariante, TipoSolicitud tipoSolicitud, EstadoSolicitud estado);
}
