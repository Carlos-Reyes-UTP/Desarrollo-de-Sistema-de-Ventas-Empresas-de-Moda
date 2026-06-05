package com.tienda.ropa.dto;

import java.util.List;

public record TrasladoMasivoDTO(
    Long idUbicacionAreaOrigen,
    Long idUbicacionAreaDestino,
    List<ItemTrasladoDTO> items
) {}
