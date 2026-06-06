package com.tienda.ropa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PrediccionLoteItemResponseDTO {

    @JsonProperty("id_producto")
    private Long idProducto;

    private String variante;

    @JsonProperty("prediccion_ventas")
    private Integer prediccionVentas;

    public PrediccionLoteItemResponseDTO() {
    }

    public PrediccionLoteItemResponseDTO(Long idProducto, String variante, Integer prediccionVentas) {
        this.idProducto = idProducto;
        this.variante = variante;
        this.prediccionVentas = prediccionVentas;
    }

    public Long getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Long idProducto) {
        this.idProducto = idProducto;
    }

    public String getVariante() {
        return variante;
    }

    public void setVariante(String variante) {
        this.variante = variante;
    }

    public Integer getPrediccionVentas() {
        return prediccionVentas;
    }

    public void setPrediccionVentas(Integer prediccionVentas) {
        this.prediccionVentas = prediccionVentas;
    }
}
