package com.tienda.ropa.dto;

import java.util.List;

public record CrearSolicitudLoteResult(String codigoLote, List<Long> idsSolicitud) {}
