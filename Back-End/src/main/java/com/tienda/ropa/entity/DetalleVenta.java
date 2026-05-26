package com.tienda.ropa.entity;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
public class DetalleVenta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDetalleVenta;

    @ManyToOne
    @JoinColumn(name = "id_venta", nullable = false)
    @JsonBackReference
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "id_producto_variante", nullable = false)
    private ProductoVariante productoVariante;

    @NotNull
    private int cantidad;

    @NotNull
    private BigDecimal precioUnitario;

    @Enumerated(EnumType.STRING)
    @Column(name = "origen_venta", length = 20)
    private OrigenVenta origenVenta;

    // Métodos manuales

    public void setVenta(Venta venta) {
        this.venta = venta;
    }

    public Long getIdDetalleVenta() {
        return idDetalleVenta;
    }

    public void setIdDetalleVenta(Long idDetalleVenta) {
        this.idDetalleVenta = idDetalleVenta;
    }

    public ProductoVariante getProductoVariante() {
        return productoVariante;
    }

    public void setProductoVariante(ProductoVariante productoVariante) {
        this.productoVariante = productoVariante;
    }

    // Método conveniente para obtener el producto base a través de la variante
    public Producto getProducto() {
        return productoVariante != null ? productoVariante.getProducto() : null;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public OrigenVenta getOrigenVenta() {
        return origenVenta;
    }

    public void setOrigenVenta(OrigenVenta origenVenta) {
        this.origenVenta = origenVenta;
    }

    public BigDecimal getSubtotal() {
        return precioUnitario.multiply(BigDecimal.valueOf(cantidad));
    }
    public void setSubtotal(BigDecimal subtotal) {
        if (cantidad == 0) {
            this.precioUnitario = BigDecimal.ZERO;
            return;
        }
        this.precioUnitario = subtotal.divide(BigDecimal.valueOf(cantidad), 2, java.math.RoundingMode.HALF_UP);
    }
}
