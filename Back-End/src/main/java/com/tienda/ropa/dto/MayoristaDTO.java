package com.tienda.ropa.dto;

import lombok.Data;

@Data
public class MayoristaDTO {
    private Long idCliente;
    private String codigoMayorista;
    
    // Datos del cliente asociado para mostrar en el frontend
    private String nombreCliente;
    private String tipoCliente;
    private String numeroDocumento;
    
    public Long getIdCliente() {
        return idCliente;
    }
    
    public void setIdCliente(Long idCliente) {
        this.idCliente = idCliente;
    }
    
    public String getCodigoMayorista() {
        return codigoMayorista;
    }
    
    public void setCodigoMayorista(String codigoMayorista) {
        this.codigoMayorista = codigoMayorista;
    }
    
    public String getNombreCliente() {
        return nombreCliente;
    }
    
    public void setNombreCliente(String nombreCliente) {
        this.nombreCliente = nombreCliente;
    }
    
    public String getTipoCliente() {
        return tipoCliente;
    }
    
    public void setTipoCliente(String tipoCliente) {
        this.tipoCliente = tipoCliente;
    }
    
    public String getNumeroDocumento() {
        return numeroDocumento;
    }
    
    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }
}
