package com.tienda.ropa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class PrediccionIARequestDTO {

    @NotNull
    @JsonProperty("id_producto")
    private Long idProducto;

    @NotBlank
    private String color;

    @NotBlank
    private String talla;

    @NotNull
    @Min(1)
    @JsonProperty("mes")
    private Integer mes;

    @NotNull
    @Min(0)
    @JsonProperty("es_campana")
    private Integer esCampana;

    @NotNull
    @Min(0)
    @JsonProperty("ventas_mes_pasado")
    private Integer ventasMesPasado;

    public Long getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Long idProducto) {
        this.idProducto = idProducto;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getTalla() {
        return talla;
    }

    public void setTalla(String talla) {
        this.talla = talla;
    }

    public Integer getMes() {
        return mes;
    }

    public void setMes(Integer mes) {
        this.mes = mes;
    }

    public Integer getEsCampana() {
        return esCampana;
    }

    public void setEsCampana(Integer esCampana) {
        this.esCampana = esCampana;
    }

    public Integer getVentasMesPasado() {
        return ventasMesPasado;
    }

    public void setVentasMesPasado(Integer ventasMesPasado) {
        this.ventasMesPasado = ventasMesPasado;
    }
}