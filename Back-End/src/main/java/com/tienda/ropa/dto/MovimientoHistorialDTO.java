package com.tienda.ropa.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record MovimientoHistorialDTO(
    UUID idGrupo,
    String usuarioNombre,
    String origenNombre,
    String destinoNombre,
    String productoNombre,
    Long idProducto,
    Integer cantidadTotal,
    LocalDateTime fecha,
    List<MovimientoDetalleDTO> detalles
) {}
