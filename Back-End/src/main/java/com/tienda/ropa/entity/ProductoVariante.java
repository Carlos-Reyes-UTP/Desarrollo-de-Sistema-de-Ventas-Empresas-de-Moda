package com.tienda.ropa.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "producto_variante")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductoVariante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto_variante")
    private Long idProductoVariante;

    @JsonBackReference
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @NotBlank
    @Column(name = "color", nullable = false, length = 160)
    private String color;

    @NotBlank
    @Column(name = "talla", nullable = false, length = 120)
    private String talla;

    @Column(name = "sku", unique = true, length = 220)
    private String sku;

    @Column(name = "codigo_barras", length = 160)
    private String codigoBarras;

    @NotNull
    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Transient
    private Integer stockAlmacen = 0;

    @JsonIgnore
    @OneToMany(mappedBy = "variante", fetch = FetchType.LAZY)
    private List<InventarioUbicacion> inventariosUbicacion = new ArrayList<>();
}
