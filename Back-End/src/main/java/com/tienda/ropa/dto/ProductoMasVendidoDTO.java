package com.tienda.ropa.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ProductoMasVendidoDTO {
    private Long idProducto;
    private String nombreProducto;
    private String codigoIdentificacion;
    private Long cantidadVendida;
    private BigDecimal ingresosTotales;
    private String categoria;
    private String subcategoria;
    private String categoriaPadre;
    private String subCategoria2;
    private String proveedor;
    private BigDecimal precioPromedio;
    private LocalDateTime ultimaVenta;
 
    // Constructor exacto para la consulta JPQL de productos más vendidos
    // Los tipos deben coincidir EXACTAMENTE con lo que Hibernate genera
    // SUM(dv.cantidad) devuelve Long cuando cantidad es int en la entidad
    // COUNT() y AVG() también devuelven tipos específicos que debemos manejar
    public ProductoMasVendidoDTO(Long idProducto, String nombreProducto, String codigoIdentificacion, 
                               Long cantidadVendida, BigDecimal ingresosTotales, String categoriaPadre,
                               String categoria, String subCategoria2, String proveedor, 
                               Double precioPromedio, LocalDateTime ultimaVenta) {
        this.idProducto = idProducto;
        this.nombreProducto = nombreProducto;
        this.codigoIdentificacion = codigoIdentificacion;
        this.cantidadVendida = cantidadVendida;
        this.ingresosTotales = ingresosTotales;
        this.categoriaPadre = categoriaPadre;
        this.categoria = categoria; // subcategoría
        this.subcategoria = categoria; // Para compatibilidad
        this.subCategoria2 = subCategoria2;
        this.proveedor = proveedor;
        this.precioPromedio = precioPromedio != null ? BigDecimal.valueOf(precioPromedio) : null;
        this.ultimaVenta = ultimaVenta;
    }
    
    // Constructor alternativo sin fecha para consultas básicas
    public ProductoMasVendidoDTO(Long idProducto, String nombreProducto, String codigoIdentificacion, 
                               Long cantidadVendida, BigDecimal ingresosTotales, String categoriaPadre,
                               String categoria, String subCategoria2, String proveedor, Double precioPromedio) {
        this.idProducto = idProducto;
        this.nombreProducto = nombreProducto;
        this.codigoIdentificacion = codigoIdentificacion;
        this.cantidadVendida = cantidadVendida;
        this.ingresosTotales = ingresosTotales;
        this.categoriaPadre = categoriaPadre;
        this.categoria = categoria; // subcategoría
        this.subcategoria = categoria; // Para compatibilidad
        this.subCategoria2 = subCategoria2;
        this.proveedor = proveedor;
        this.precioPromedio = precioPromedio != null ? BigDecimal.valueOf(precioPromedio) : null;
        this.ultimaVenta = null;
    }
}
