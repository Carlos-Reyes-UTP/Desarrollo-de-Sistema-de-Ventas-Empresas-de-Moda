package com.tienda.ropa.service;

import com.tienda.ropa.dto.AlmacenAtenderLoteResultDTO;
import com.tienda.ropa.dto.AlmacenSolicitudCardDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.Usuario;

import java.util.List;

public interface SolicitudService {

    Solicitud crear(CrearSolicitudDTO dto, Long idUsuario);

    Solicitud crearSistema(CrearSolicitudDTO dto);

    List<Solicitud> listar();

    Solicitud cambiarEstado(Long idSolicitud, String nuevoEstado);

    List<AlmacenSolicitudCardDTO> listarColaPendientes(Usuario usuario, String sectorOpcional);

    Solicitud atenderSolicitud(Long idSolicitud, Usuario usuario);

    /** Atiende varias solicitudes en una transacción (ids sin duplicar). Devuelve cuáles se atendieron y cuáles se rechazaron por falta de stock. */
    AlmacenAtenderLoteResultDTO atenderSolicitudesLote(List<Long> idsSolicitud, Usuario usuario);

    Solicitud rechazarSolicitud(Long idSolicitud, MotivoRechazoSolicitud motivo, Usuario usuario);
}
