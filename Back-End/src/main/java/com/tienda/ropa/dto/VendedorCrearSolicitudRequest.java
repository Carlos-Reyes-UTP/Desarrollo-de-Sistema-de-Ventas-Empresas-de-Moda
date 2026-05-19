package com.tienda.ropa.dto;

public record VendedorCrearSolicitudRequest(
        Long idVariante,
        Integer cantidad,
        String tipoSolicitud,
        /** Área/piso destino elegido por el vendedor. Si es null se intenta inferir desde el inventario. */
        Long idUbicacionAreaDestino,
        String codigoLote
) {}
