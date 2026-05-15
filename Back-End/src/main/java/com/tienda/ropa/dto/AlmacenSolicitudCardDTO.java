package com.tienda.ropa.dto;

import java.time.Instant;
import java.util.List;

public record AlmacenSolicitudCardDTO(
        Long idSolicitud,
        String tipoSolicitud,
        Instant fechaCreacion,
        Long idUsuario,
        String nombreVendedor,
        List<AlmacenSolicitudLineaDTO> lineas
) {}
