package com.tienda.ropa.dto;

import java.util.List;

public record CoberturaUbicacionesDTO(
        int pisosActivos,
        int sectoresActivos,
        int combinacionesPosibles,
        int combinacionesExistentes,
        int combinacionesFaltantes,
        List<CombinacionFaltanteDTO> faltantes
) {}
