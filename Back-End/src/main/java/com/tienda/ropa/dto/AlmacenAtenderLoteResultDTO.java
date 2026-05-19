package com.tienda.ropa.dto;

import java.util.List;

public record AlmacenAtenderLoteResultDTO(
        List<Long> atendidos,
        List<Long> rechazados
) {}
