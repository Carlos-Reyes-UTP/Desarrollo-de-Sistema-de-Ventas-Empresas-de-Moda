package com.tienda.ropa.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportePorCategoriaDTO {
    private Long idCategoria;
    private String categoria;
    private String subcategoria;
    private Long cantidadProductosVendidos;
    private Long cantidadTotalVendida;
    private BigDecimal ingresosTotales;
    private String productoMasVendidoNombre;
    private Long productoMasVendidoCantidad;
    private BigDecimal porcentajeDelTotal;
    
    // Constructor exacto para la consulta JPQL en ReporteRepository
    // COUNT(DISTINCT p.id) devuelve Long
    // SUM(dv.cantidad) devuelve Long cuando cantidad es int en la entidad
    public ReportePorCategoriaDTO(Long idCategoria, String categoria, Long cantidadProductosVendidos, 
                                 Long cantidadTotalVendida, BigDecimal ingresosTotales,
                                 String productoMasVendidoNombre, Long productoMasVendidoCantidad) {
        this.idCategoria = idCategoria;
        this.categoria = categoria;
        this.cantidadProductosVendidos = cantidadProductosVendidos;
        this.cantidadTotalVendida = cantidadTotalVendida;
        this.ingresosTotales = ingresosTotales;
        this.productoMasVendidoNombre = productoMasVendidoNombre;
        this.productoMasVendidoCantidad = productoMasVendidoCantidad;
    }

    // Constructor para consultas sin ID (mantener para compatibilidad)
    public ReportePorCategoriaDTO(String categoria, Long cantidadProductosVendidos, 
                                 Long cantidadTotalVendida, BigDecimal ingresosTotales,
                                 String productoMasVendidoNombre, Long productoMasVendidoCantidad) {
        this.categoria = categoria;
        this.cantidadProductosVendidos = cantidadProductosVendidos;
        this.cantidadTotalVendida = cantidadTotalVendida;
        this.ingresosTotales = ingresosTotales;
        this.productoMasVendidoNombre = productoMasVendidoNombre;
        this.productoMasVendidoCantidad = productoMasVendidoCantidad;
    }
    
    // Constructor para consultas sin subcategoría (mantener para compatibilidad)
    // SUM(dv.cantidad) devuelve BigDecimal cuando cantidad es int en la entidad
    public ReportePorCategoriaDTO(String categoria, BigDecimal cantidadProductosVendidos, 
                                 BigDecimal cantidadTotalVendida, BigDecimal ingresosTotales,
                                 String productoMasVendidoNombre, BigDecimal productoMasVendidoCantidad) {
        this.categoria = categoria;
        this.cantidadProductosVendidos = cantidadProductosVendidos != null ? cantidadProductosVendidos.longValue() : null;
        this.cantidadTotalVendida = cantidadTotalVendida != null ? cantidadTotalVendida.longValue() : null;
        this.ingresosTotales = ingresosTotales;
        this.productoMasVendidoNombre = productoMasVendidoNombre;
        this.productoMasVendidoCantidad = productoMasVendidoCantidad != null ? productoMasVendidoCantidad.longValue() : null;
    }
    
    // Getter para el objeto productoMasVendido que espera el frontend
    public ProductoMasVendido getProductoMasVendido() {
        if (productoMasVendidoNombre != null && productoMasVendidoCantidad != null) {
            return new ProductoMasVendido(productoMasVendidoNombre, productoMasVendidoCantidad);
        }
        return null;
    }
    
    // Clase interna para el producto más vendido
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductoMasVendido {
        private String nombre;
        private Long cantidadVendida;
    }
}
