package com.tienda.ropa.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
@Table(name = "producto_variante")
public class

ProductoVariante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto_variante")
    private Long idProductoVariante;

    @JsonBackReference
    @NotNull
    @ManyToOne
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "id_talla", nullable = false)
    private Talla talla;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "id_color", nullable = false)
    private Color color;

    @NotNull
    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Column(name = "codigo_barras_variante")
    private String codigoBarrasVariante;
}
