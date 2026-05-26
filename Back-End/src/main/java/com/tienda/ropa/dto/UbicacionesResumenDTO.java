package com.tienda.ropa.dto;

import java.util.List;

public record UbicacionesResumenDTO(
        List<UbicacionPisoGrupoDTO> grupos,
        CoberturaUbicacionesDTO cobertura,
        ResumenGlobalUbicacionesDTO global
) {}
