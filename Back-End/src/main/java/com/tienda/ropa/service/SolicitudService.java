package com.tienda.ropa.service;

import com.tienda.ropa.dto.AlmacenSolicitudCardDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.Solicitud;

import java.util.List;

public interface SolicitudService {

    Solicitud crear(CrearSolicitudDTO dto, Long idUsuario);

    Solicitud crearSistema(CrearSolicitudDTO dto);

    List<Solicitud> listar();

    Solicitud cambiarEstado(Long idSolicitud, String nuevoEstado);

    List<AlmacenSolicitudCardDTO> listarColaPendientes();

    Solicitud atenderSolicitud(Long idSolicitud);

    /** Atiende varias solicitudes en una transacción (ids sin duplicar). */
    void atenderSolicitudesLote(List<Long> idsSolicitud);

    Solicitud rechazarSolicitud(Long idSolicitud, MotivoRechazoSolicitud motivo);
}
