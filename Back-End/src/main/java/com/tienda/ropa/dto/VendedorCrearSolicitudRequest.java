package com.tienda.ropa.dto;

public record VendedorCrearSolicitudRequest(
        Long idVariante,
        Integer cantidad,
        String tipoSolicitud
) {}
