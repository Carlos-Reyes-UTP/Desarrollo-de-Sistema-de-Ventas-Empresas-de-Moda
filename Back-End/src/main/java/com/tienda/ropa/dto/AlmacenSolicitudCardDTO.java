package com.tienda.ropa.dto;

import java.time.Instant;
import java.util.List;

public record AlmacenSolicitudCardDTO(
        Long idSolicitud,
        String tipoSolicitud,
        Instant fechaCreacion,
        Long idUsuario,
        String nombreVendedor,
        String codigoLote,
        Long idUbicacionAreaOrigen,
        String pisoOrigen,
        String sectorOrigen,
        String etiquetaOrigen,
        Long idUbicacionAreaDestino,
        String pisoDestino,
        String sectorDestino,
        String etiquetaDestino,
        List<AlmacenSolicitudLineaDTO> lineas
) {}
