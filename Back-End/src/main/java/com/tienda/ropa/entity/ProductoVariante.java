package com.tienda.ropa.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
@Table(name = "producto_variante")
public class ProductoVariante {
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

    public Long getIdProductoVariante() {
        return idProductoVariante;
    }

    public void setIdProductoVariante(Long idProductoVariante) {
        this.idProductoVariante = idProductoVariante;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Talla getTalla() {
        return talla;
    }

    public void setTalla(Talla talla) {
        this.talla = talla;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public String getCodigoBarrasVariante() {
        return codigoBarrasVariante;
    }

    public void setCodigoBarrasVariante(String codigoBarrasVariante) {
        this.codigoBarrasVariante = codigoBarrasVariante;
    }
}
