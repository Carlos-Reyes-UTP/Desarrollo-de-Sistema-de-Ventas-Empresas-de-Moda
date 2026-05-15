package com.tienda.ropa.dto;

import java.util.List;

public record CrearSolicitudDTO(
        String tipoSolicitud,
        Long idUbicacionOrigen,
        Long idUbicacionDestino,
        List<DetalleSolicitudLineaDTO> detalles
) {}
