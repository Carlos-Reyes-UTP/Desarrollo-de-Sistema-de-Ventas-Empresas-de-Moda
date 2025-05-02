package com.tienda.ropa.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class RUC extends Comprador {
    @Column(unique = true)
    private String numeroRuc;

    private String razonSocial;

    public String getNumeroRuc() {
        return numeroRuc;
    }

    public void setNumeroRuc(String numeroRuc) {
        this.numeroRuc = numeroRuc;
    }

    public String getRazonSocial() {
        return razonSocial;
    }

    public void setRazonSocial(String razonSocial) {
        this.razonSocial = razonSocial;
    }
}