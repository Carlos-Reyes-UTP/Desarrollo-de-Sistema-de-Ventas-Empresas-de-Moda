package com.tienda.ropa.dto;

import lombok.Data;

@Data
public class SunatResponseDTO {
    private String razonSocial;
    private String tipoDocumento;
    private String numeroDocumento;
    private String estado;
    private String condicion;
    private String direccion;
    private String ubigeo;
    private String viaTipo;
    private String viaNombre;
    private String zonaCodigo;
    private String zonaTipo;
    private String numero;
    private String interior;
    private String lote;
    private String dpto;
    private String manzana;
    private String kilometro;
    private String distrito;
    private String provincia;
    private String departamento;
    private Boolean esAgenteRetencion;

    // Getters y setters
    public String getRazonSocial() {
        return razonSocial;
    }

    public void setRazonSocial(String razonSocial) {
        this.razonSocial = razonSocial;
    }

    public String getTipoDocumento() {
        return tipoDocumento;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getNumeroDocumento() {
        return numeroDocumento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getCondicion() {
        return condicion;
    }

    public void setCondicion(String condicion) {
        this.condicion = condicion;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    // Los demás getters y setters

    // Método para obtener una dirección formateada completa
    public String getDireccionCompleta() {
        StringBuilder sb = new StringBuilder();
        if (viaTipo != null && !viaTipo.isEmpty()) {
            sb.append(viaTipo).append(" ");
        }
        if (viaNombre != null && !viaNombre.isEmpty()) {
            sb.append(viaNombre).append(" ");
        }
        if (numero != null && !numero.isEmpty() && !numero.equals("-")) {
            sb.append("NRO ").append(numero).append(" ");
        }
        if (interior != null && !interior.isEmpty() && !interior.equals("-")) {
            sb.append("INT. ").append(interior).append(" ");
        }
        if (zonaCodigo != null && !zonaCodigo.isEmpty()) {
            sb.append(zonaCodigo).append(" ");
        }
        if (zonaTipo != null && !zonaTipo.isEmpty()) {
            sb.append(zonaTipo);
        }
        return sb.toString().trim();
    }
}
