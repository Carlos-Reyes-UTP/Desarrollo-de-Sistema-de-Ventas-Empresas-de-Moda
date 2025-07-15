package com.tienda.dto;

import java.math.BigDecimal;

public class VariantesPorColorDTO {
    private Long idColor;
    private String nombreColor;
    private Long cantidadVariantes;
    private Integer cantidadStock;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;

    // Constructores
    public VariantesPorColorDTO() {}

    public VariantesPorColorDTO(Long idColor, String nombreColor, Long cantidadVariantes, 
                               Integer cantidadStock, Long cantidadVendida, BigDecimal ingresosTotales) {
        this.idColor = idColor;
        this.nombreColor = nombreColor;
        this.cantidadVariantes = cantidadVariantes;
        this.cantidadStock = cantidadStock != null ? cantidadStock : 0;
        this.cantidadVendida = cantidadVendida != null ? cantidadVendida : 0L;
        this.ingresosTotales = ingresosTotales != null ? ingresosTotales : BigDecimal.ZERO;
    }

    // Constructor para query simple (solo contar variantes)
    public VariantesPorColorDTO(Long idColor, String nombreColor, Long cantidadVariantes) {
        this.idColor = idColor;
        this.nombreColor = nombreColor;
        this.cantidadVariantes = cantidadVariantes;
        this.cantidadStock = 0;
        this.cantidadVendida = 0L;
        this.ingresosTotales = BigDecimal.ZERO;
    }

    // Getters y Setters
    public Long getIdColor() {
        return idColor;
    }

    public void setIdColor(Long idColor) {
        this.idColor = idColor;
    }

    public String getNombreColor() {
        return nombreColor;
    }

    public void setNombreColor(String nombreColor) {
        this.nombreColor = nombreColor;
    }

    public Long getCantidadVariantes() {
        return cantidadVariantes;
    }

    public void setCantidadVariantes(Long cantidadVariantes) {
        this.cantidadVariantes = cantidadVariantes;
    }

    public Integer getCantidadStock() {
        return cantidadStock;
    }

    public void setCantidadStock(Integer cantidadStock) {
        this.cantidadStock = cantidadStock;
    }

    public Long getCantidadVendida() {
        return cantidadVendida;
    }

    public void setCantidadVendida(Long cantidadVendida) {
        this.cantidadVendida = cantidadVendida;
    }

    public BigDecimal getIngresosTotales() {
        return ingresosTotales;
    }

    public void setIngresosTotales(BigDecimal ingresosTotales) {
        this.ingresosTotales = ingresosTotales;
    }
}
