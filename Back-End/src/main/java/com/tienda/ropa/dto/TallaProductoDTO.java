package com.tienda.ropa.dto;

public class TallaProductoDTO {
    private Long idTalla;
    private String nombreTalla;
    private Long cantidadVariantes;

    // Constructores
    public TallaProductoDTO() {}

    public TallaProductoDTO(Long idTalla, String nombreTalla, Long cantidadVariantes) {
        this.idTalla = idTalla;
        this.nombreTalla = nombreTalla;
        this.cantidadVariantes = cantidadVariantes;
    }

    // Getters y Setters
    public Long getIdTalla() {
        return idTalla;
    }

    public void setIdTalla(Long idTalla) {
        this.idTalla = idTalla;
    }

    public String getNombreTalla() {
        return nombreTalla;
    }

    public void setNombreTalla(String nombreTalla) {
        this.nombreTalla = nombreTalla;
    }

    public Long getCantidadVariantes() {
        return cantidadVariantes;
    }

    public void setCantidadVariantes(Long cantidadVariantes) {
        this.cantidadVariantes = cantidadVariantes;
    }
}
