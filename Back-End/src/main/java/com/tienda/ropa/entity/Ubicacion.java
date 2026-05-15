package com.tienda.ropa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ubicacion")
public class Ubicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ubicacion")
    private Long idUbicacion;

    @NotBlank
    @Column(name = "nombre", nullable = false, length = 120)
    private String nombre;

    @Column(name = "area", length = 120)
    private String area;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;
}
