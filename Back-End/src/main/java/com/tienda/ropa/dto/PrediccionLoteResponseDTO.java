package com.tienda.ropa.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PrediccionLoteResponseDTO {

    private String status;
    private List<PrediccionLoteItemResponseDTO> resultados;

    public PrediccionLoteResponseDTO() {
    }

    public PrediccionLoteResponseDTO(String status, List<PrediccionLoteItemResponseDTO> resultados) {
        this.status = status;
        this.resultados = resultados;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<PrediccionLoteItemResponseDTO> getResultados() {
        return resultados;
    }

    public void setResultados(List<PrediccionLoteItemResponseDTO> resultados) {
        this.resultados = resultados;
    }
}
