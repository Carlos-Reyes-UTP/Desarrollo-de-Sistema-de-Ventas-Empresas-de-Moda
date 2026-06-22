package com.tienda.ropa.dto;

import java.time.Instant;
import java.util.List;

public record SupervisorHistorialSolicitudDTO(
        Long idSolicitud,
        String tipoSolicitud,
        String estado,
        Instant fechaCreacion,
        Long idUsuario,
        String nombreVendedor,
        Long idUbicacionAreaOrigen,
        String pisoOrigen,
        String sectorOrigen,
        String etiquetaOrigen,
        Long idUbicacionAreaDestino,
        String pisoDestino,
        String sectorDestino,
        String etiquetaDestino,
        String codigoLote,
        String motivoRechazo,
        String comentarioRechazo,
        String nombreUsuarioAtendio,
        List<AlmacenSolicitudLineaDTO> lineas
) {}
