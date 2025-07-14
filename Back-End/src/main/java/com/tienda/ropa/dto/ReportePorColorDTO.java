package com.tienda.ropa.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ReportePorColorDTO {
    private String nombreColor;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;
    private Long productosDistintos;
    private BigDecimal porcentajeDelTotal;
    
    // Constructor exacto para la consulta JPQL en ReporteRepository
    // SUM(dv.cantidad) devuelve Long cuando cantidad es int en la entidad
    // COUNT(DISTINCT p.id) devuelve Long
    public ReportePorColorDTO(String nombreColor, Long cantidadVendida, 
                             BigDecimal ingresosTotales, Long productosDistintos) {
        this.nombreColor = nombreColor;
        this.cantidadVendida = cantidadVendida;
        this.ingresosTotales = ingresosTotales;
        this.productosDistintos = productosDistintos;
    }

    // Constructor para consultas básicas (mantener para compatibilidad)
    // SUM(dv.cantidad) devuelve BigDecimal cuando cantidad es int en la entidad
    public ReportePorColorDTO(String nombreColor, BigDecimal cantidadVendida, 
                             BigDecimal ingresosTotales, BigDecimal productosDistintos) {
        this.nombreColor = nombreColor;
        this.cantidadVendida = cantidadVendida != null ? cantidadVendida.longValue() : null;
        this.ingresosTotales = ingresosTotales;
        this.productosDistintos = productosDistintos != null ? productosDistintos.longValue() : null;
    }
}
