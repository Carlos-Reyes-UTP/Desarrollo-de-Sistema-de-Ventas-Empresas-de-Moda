package com.tienda.ropa.dto;

import com.tienda.ropa.entity.Solicitud;

public record SolicitudAccionResponseDTO(
        Long idSolicitud,
        String estado,
        String motivoRechazo
) {
    public static SolicitudAccionResponseDTO from(Solicitud solicitud) {
        if (solicitud == null) {
            return null;
        }
        return new SolicitudAccionResponseDTO(
                solicitud.getIdSolicitud(),
                solicitud.getEstado() != null ? solicitud.getEstado().name() : null,
                solicitud.getMotivoRechazo() != null ? solicitud.getMotivoRechazo().name() : null
        );
    }
}
