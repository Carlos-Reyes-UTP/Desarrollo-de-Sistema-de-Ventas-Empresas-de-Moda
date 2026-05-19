package com.tienda.ropa.dto;

import java.util.List;

public record VendedorCrearSolicitudLoteRequest(
        String codigoLote,
        List<VendedorCrearSolicitudLoteItem> items
) {
    public record VendedorCrearSolicitudLoteItem(
            Long idVariante,
            Integer cantidad,
            Long idUbicacionAreaDestino
    ) {}
}
