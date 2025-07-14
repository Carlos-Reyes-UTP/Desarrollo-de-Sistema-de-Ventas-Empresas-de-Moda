package com.tienda.ropa.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ReportePorTallaDTO {
    private String nombreTalla;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;
    private Long productosDistintos;
    private BigDecimal porcentajeDelTotal;
    private BigDecimal precioPromedio;
    
    // Constructor exacto para la consulta JPQL en ReporteRepository
    // SUM(dv.cantidad) devuelve Long cuando cantidad es int en la entidad
    // COUNT(DISTINCT p.id) devuelve Long
    // AVG(dv.precioUnitario) devuelve Double
    public ReportePorTallaDTO(String nombreTalla, Long cantidadVendida, 
                             BigDecimal ingresosTotales, Long productosDistintos,
                             Double precioPromedio) {
        this.nombreTalla = nombreTalla;
        this.cantidadVendida = cantidadVendida;
        this.ingresosTotales = ingresosTotales;
        this.productosDistintos = productosDistintos;
        this.porcentajeDelTotal = null; // Se puede calcular posteriormente
        this.precioPromedio = precioPromedio != null ? BigDecimal.valueOf(precioPromedio) : null;
    }

    // Constructor para consultas básicas (mantener para compatibilidad)
    // SUM(dv.cantidad) devuelve BigDecimal cuando cantidad es int en la entidad
    public ReportePorTallaDTO(String nombreTalla, BigDecimal cantidadVendida, 
                             BigDecimal ingresosTotales, BigDecimal productosDistintos,
                             BigDecimal precioPromedio) {
        this.nombreTalla = nombreTalla;
        this.cantidadVendida = cantidadVendida != null ? cantidadVendida.longValue() : null;
        this.ingresosTotales = ingresosTotales;
        this.productosDistintos = productosDistintos != null ? productosDistintos.longValue() : null;
        this.porcentajeDelTotal = null; // Se puede calcular posteriormente
        this.precioPromedio = precioPromedio;
    }

    // Constructor que incluye todos los parámetros requeridos por la consulta en ReporteRepository
    public ReportePorTallaDTO(String nombreTalla, BigDecimal cantidadVendida, BigDecimal ingresosTotales, BigDecimal productosDistintos, BigDecimal porcentajeDelTotal, BigDecimal precioPromedio) {
        this.nombreTalla = nombreTalla;
        this.cantidadVendida = cantidadVendida != null ? cantidadVendida.longValue() : null;
        this.ingresosTotales = ingresosTotales;
        this.productosDistintos = productosDistintos != null ? productosDistintos.longValue() : null;
        this.porcentajeDelTotal = porcentajeDelTotal;
        this.precioPromedio = precioPromedio;
    }
}
