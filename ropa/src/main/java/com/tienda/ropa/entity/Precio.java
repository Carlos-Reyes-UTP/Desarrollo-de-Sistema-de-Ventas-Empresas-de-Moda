package com.tienda.ropa.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
public class Precio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idDescuento;

    @ManyToOne
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    private BigDecimal precioUnitario;

    private BigDecimal precioCuarto;

    private BigDecimal precioMediaDocena;

    private BigDecimal precioDocena;

    public Long getIdDescuento() {
        return idDescuento;
    }

    public void setIdDescuento(Long idDescuento) {
        this.idDescuento = idDescuento;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getPrecioCuarto() {
        return precioCuarto;
    }

    public void setPrecioCuarto(BigDecimal precioCuarto) {
        this.precioCuarto = precioCuarto;
    }

    public BigDecimal getPrecioMediaDocena() {
        return precioMediaDocena;
    }

    public void setPrecioMediaDocena(BigDecimal precioMediaDocena) {
        this.precioMediaDocena = precioMediaDocena;
    }

    public BigDecimal getPrecioDocena() {
        return precioDocena;
    }

    public void setPrecioDocena(BigDecimal precioDocena) {
        this.precioDocena = precioDocena;
    }
}