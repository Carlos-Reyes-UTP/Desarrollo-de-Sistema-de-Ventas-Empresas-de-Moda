package com.tienda.ropa.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class VarianteMasVendidaDTO {
    private Long idProductoVariante;
    private Long idProducto;
    private String nombreProducto;
    private String color;
    private String talla;
    private String codigoIdentificacion;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;
    private String categoriaPadre;
    private String categoria;
    private String subCategoria2;
    private String proveedor;
    private BigDecimal precioPromedio;
    private LocalDateTime ultimaVenta;

    public VarianteMasVendidaDTO(
            Long idProductoVariante,
            Long idProducto,
            String nombreProducto,
            String color,
            String talla,
            String codigoIdentificacion,
            Long cantidadVendida,
            BigDecimal ingresosTotales,
            String categoriaPadre,
            String categoria,
            String subCategoria2,
            String proveedor,
            Double precioPromedio,
            LocalDateTime ultimaVenta) {
        this.idProductoVariante = idProductoVariante;
        this.idProducto = idProducto;
        this.nombreProducto = nombreProducto;
        this.color = color;
        this.talla = talla;
        this.codigoIdentificacion = codigoIdentificacion;
        this.cantidadVendida = cantidadVendida;
        this.ingresosTotales = ingresosTotales;
        this.categoriaPadre = categoriaPadre;
        this.categoria = categoria;
        this.subCategoria2 = subCategoria2;
        this.proveedor = proveedor;
        this.precioPromedio = precioPromedio != null ? BigDecimal.valueOf(precioPromedio) : null;
        this.ultimaVenta = ultimaVenta;
    }
}
