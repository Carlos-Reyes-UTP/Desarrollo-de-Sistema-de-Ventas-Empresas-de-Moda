package com.tienda.ropa.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodigoBarrasDTO {
    private String codigo;
    private Integer ancho;
    private Integer alto;
}
