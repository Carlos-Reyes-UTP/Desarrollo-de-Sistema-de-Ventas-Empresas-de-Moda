package com.tienda.ropa.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Comprador {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idComprador;

    public Long getIdComprador() {
        return idComprador;
    }

    public void setIdComprador(Long idComprador) {
        this.idComprador = idComprador;
    }
}