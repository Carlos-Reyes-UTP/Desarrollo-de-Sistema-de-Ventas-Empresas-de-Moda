package com.tienda.ropa.dto;

import java.util.List;

public record CrearSolicitudDTO(
        String tipoSolicitud,
        Long idUbicacionAreaOrigen,
        Long idUbicacionAreaDestino,
        List<DetalleSolicitudLineaDTO> detalles,
        String codigoLote
) {}
