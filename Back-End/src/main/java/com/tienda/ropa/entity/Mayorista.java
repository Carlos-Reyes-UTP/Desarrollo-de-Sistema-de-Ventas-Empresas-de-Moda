package com.tienda.ropa.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class Mayorista {
    @Id
    private Long idCliente;
    
    @OneToOne
    @MapsId
    @JoinColumn(name = "id_cliente")
    private Cliente cliente;
    
    @Column(name = "codigo_mayorista", nullable = false, unique = true)
    private String codigoMayorista;
    
    public Long getIdCliente() {
        return idCliente;
    }

    public void setIdCliente(Long idCliente) {
        this.idCliente = idCliente;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public String getCodigoMayorista() {
        return codigoMayorista;
    }

    public void setCodigoMayorista(String codigoMayorista) {
        this.codigoMayorista = codigoMayorista;
    }
}