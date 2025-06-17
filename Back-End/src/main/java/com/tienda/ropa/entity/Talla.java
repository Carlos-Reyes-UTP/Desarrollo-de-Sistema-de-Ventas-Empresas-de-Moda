package com.tienda.ropa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Entity
public class Talla {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_talla")
    private Long idTalla;

    @NotBlank(message = "El nombre de la talla no puede estar vacío")
    @Size(min = 1, max = 10, message = "El nombre de la talla debe tener entre 1 y 10 caracteres")
    @Column(name = "nombre_talla", nullable = false, unique = true)
    private String nombreTalla;

    @Column(name = "descripcion")
    private String descripcion;
}