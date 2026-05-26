package com.tienda.ropa.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Respuesta ligera para listados de ventas (dashboard, reportes, cierre de caja).
 * Evita serializar el grafo completo de entidades JPA con open-in-view=false.
 */
public class VentaListadoDTO {

    private Long idVenta;
    private LocalDateTime fechaVenta;
    private BigDecimal totalVentas;
    private String metodoPago;
    private String tipoComprobante;
    private UsuarioVentaDTO usuario;
    private ClienteVentaDTO cliente;
    private List<DetalleVentaListadoDTO> detalles = new ArrayList<>();

    public Long getIdVenta() {
        return idVenta;
    }

    public void setIdVenta(Long idVenta) {
        this.idVenta = idVenta;
    }

    public LocalDateTime getFechaVenta() {
        return fechaVenta;
    }

    public void setFechaVenta(LocalDateTime fechaVenta) {
        this.fechaVenta = fechaVenta;
    }

    public BigDecimal getTotalVentas() {
        return totalVentas;
    }

    public void setTotalVentas(BigDecimal totalVentas) {
        this.totalVentas = totalVentas;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }

    public String getTipoComprobante() {
        return tipoComprobante;
    }

    public void setTipoComprobante(String tipoComprobante) {
        this.tipoComprobante = tipoComprobante;
    }

    public UsuarioVentaDTO getUsuario() {
        return usuario;
    }

    public void setUsuario(UsuarioVentaDTO usuario) {
        this.usuario = usuario;
    }

    public ClienteVentaDTO getCliente() {
        return cliente;
    }

    public void setCliente(ClienteVentaDTO cliente) {
        this.cliente = cliente;
    }

    public List<DetalleVentaListadoDTO> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<DetalleVentaListadoDTO> detalles) {
        this.detalles = detalles != null ? detalles : new ArrayList<>();
    }

    public static class UsuarioVentaDTO {
        private Long id;
        private String usuario;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getUsuario() {
            return usuario;
        }

        public void setUsuario(String usuario) {
            this.usuario = usuario;
        }
    }

    public static class ClienteVentaDTO {
        private Long idCliente;
        private String nombreCliente;
        private String numeroDocumento;
        private String tipoCliente;

        public Long getIdCliente() {
            return idCliente;
        }

        public void setIdCliente(Long idCliente) {
            this.idCliente = idCliente;
        }

        public String getNombreCliente() {
            return nombreCliente;
        }

        public void setNombreCliente(String nombreCliente) {
            this.nombreCliente = nombreCliente;
        }

        public String getNumeroDocumento() {
            return numeroDocumento;
        }

        public void setNumeroDocumento(String numeroDocumento) {
            this.numeroDocumento = numeroDocumento;
        }

        public String getTipoCliente() {
            return tipoCliente;
        }

        public void setTipoCliente(String tipoCliente) {
            this.tipoCliente = tipoCliente;
        }
    }

    public static class DetalleVentaListadoDTO {
        private Long idDetalleVenta;
        private int cantidad;
        private BigDecimal precioUnitario;
        private ProductoVarianteVentaDTO productoVariante;

        public Long getIdDetalleVenta() {
            return idDetalleVenta;
        }

        public void setIdDetalleVenta(Long idDetalleVenta) {
            this.idDetalleVenta = idDetalleVenta;
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

        public ProductoVarianteVentaDTO getProductoVariante() {
            return productoVariante;
        }

        public void setProductoVariante(ProductoVarianteVentaDTO productoVariante) {
            this.productoVariante = productoVariante;
        }
    }

    public static class ProductoVarianteVentaDTO {
        private Long idProductoVariante;
        private String color;
        private String talla;
        private String sku;
        private ProductoVentaDTO producto;

        public Long getIdProductoVariante() {
            return idProductoVariante;
        }

        public void setIdProductoVariante(Long idProductoVariante) {
            this.idProductoVariante = idProductoVariante;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }

        public String getTalla() {
            return talla;
        }

        public void setTalla(String talla) {
            this.talla = talla;
        }

        public String getSku() {
            return sku;
        }

        public void setSku(String sku) {
            this.sku = sku;
        }

        public ProductoVentaDTO getProducto() {
            return producto;
        }

        public void setProducto(ProductoVentaDTO producto) {
            this.producto = producto;
        }
    }

    public static class ProductoVentaDTO {
        private Long idProducto;
        private String nombre;
        private String codigoIdentificacion;

        public Long getIdProducto() {
            return idProducto;
        }

        public void setIdProducto(Long idProducto) {
            this.idProducto = idProducto;
        }

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }

        public String getCodigoIdentificacion() {
            return codigoIdentificacion;
        }

        public void setCodigoIdentificacion(String codigoIdentificacion) {
            this.codigoIdentificacion = codigoIdentificacion;
        }
    }
}
