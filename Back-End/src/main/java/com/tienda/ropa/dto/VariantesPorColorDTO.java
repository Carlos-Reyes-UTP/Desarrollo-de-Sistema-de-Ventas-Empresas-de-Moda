package com.tienda.ropa.dto;

import java.math.BigDecimal;

public class VariantesPorColorDTO {
    private Long idColor;
    private String nombreColor;
    private String hexColor;
    private Integer cantidadStock;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;

    // Constructores
    public VariantesPorColorDTO() {}

    // Constructor principal para la consulta JPQL optimizada
    public VariantesPorColorDTO(Long idColor, String nombreColor, String hexColor, 
                               Long cantidadStock, Long cantidadVendida, BigDecimal ingresosTotales) {
        this.idColor = idColor;
        this.nombreColor = nombreColor;
        this.hexColor = hexColor;
        this.cantidadStock = cantidadStock != null ? cantidadStock.intValue() : 0;
        this.cantidadVendida = cantidadVendida != null ? cantidadVendida : 0L;
        this.ingresosTotales = ingresosTotales != null ? ingresosTotales : BigDecimal.ZERO;
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

    public String getHexColor() {
        return hexColor;
    }

    public void setHexColor(String hexColor) {
        this.hexColor = hexColor;
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
