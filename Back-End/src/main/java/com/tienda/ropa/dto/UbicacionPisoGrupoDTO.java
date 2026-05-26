package com.tienda.ropa.dto;

import java.util.List;

public record UbicacionPisoGrupoDTO(
        Long idUbicacion,
        String nombrePiso,
        boolean pisoActivo,
        boolean reservado,
        List<UbicacionOperativaDTO> ubicaciones,
        long totalUnidadesPiso,
        int sectoresActivos,
        int sectoresConStock
) {}
