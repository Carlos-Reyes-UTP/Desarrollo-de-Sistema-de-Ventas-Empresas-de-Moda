package com.tienda.ropa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PrediccionIAResponseDTO {

    @JsonProperty("cantidad_recomendada")
    private Integer cantidadRecomendada;

    public PrediccionIAResponseDTO() {
    }

    public PrediccionIAResponseDTO(Integer cantidadRecomendada) {
        this.cantidadRecomendada = cantidadRecomendada;
    }

    public Integer getCantidadRecomendada() {
        return cantidadRecomendada;
    }

    public void setCantidadRecomendada(Integer cantidadRecomendada) {
        this.cantidadRecomendada = cantidadRecomendada;
    }
}