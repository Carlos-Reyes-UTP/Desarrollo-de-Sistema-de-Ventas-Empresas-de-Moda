package com.tienda.ropa.dto;

import lombok.Data;

@Data
public class ProductoVarianteDTO {
    private Long idProductoVariante;
    private String codigoBarrasVariante;
    private Integer cantidad;
    
    // Información del producto
    private Long idProducto;
    private String nombreProducto;
    private String descripcionProducto;
    private String codigoProducto;
    private Double precioProducto;
    
    // Información de talla
    private Long idTalla;
    private String nombreTalla;
    
    // Información de color
    private Long idColor;
    private String nombreColor;
    
    public ProductoVarianteDTO() {}
    
    public ProductoVarianteDTO(Long idProductoVariante, String codigoBarrasVariante, Integer cantidad,
                              Long idProducto, String nombreProducto, String descripcionProducto, 
                              String codigoProducto, Double precioProducto,
                              Long idTalla, String nombreTalla,
                              Long idColor, String nombreColor) {
        this.idProductoVariante = idProductoVariante;
        this.codigoBarrasVariante = codigoBarrasVariante;
        this.cantidad = cantidad;
        this.idProducto = idProducto;
        this.nombreProducto = nombreProducto;
        this.descripcionProducto = descripcionProducto;
        this.codigoProducto = codigoProducto;
        this.precioProducto = precioProducto;
        this.idTalla = idTalla;
        this.nombreTalla = nombreTalla;
        this.idColor = idColor;
        this.nombreColor = nombreColor;
    }
}
