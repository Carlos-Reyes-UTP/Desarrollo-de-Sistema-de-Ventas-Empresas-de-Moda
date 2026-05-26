package com.tienda.ropa.mapper;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.tienda.ropa.dto.VentaListadoDTO;
import com.tienda.ropa.dto.VentaListadoDTO.ClienteVentaDTO;
import com.tienda.ropa.dto.VentaListadoDTO.DetalleVentaListadoDTO;
import com.tienda.ropa.dto.VentaListadoDTO.ProductoVarianteVentaDTO;
import com.tienda.ropa.dto.VentaListadoDTO.ProductoVentaDTO;
import com.tienda.ropa.dto.VentaListadoDTO.UsuarioVentaDTO;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Venta;

public final class VentaListadoMapper {

    private VentaListadoMapper() {
    }

    public static List<VentaListadoDTO> toListadoDTOs(List<Venta> ventas) {
        if (ventas == null || ventas.isEmpty()) {
            return Collections.emptyList();
        }
        return ventas.stream().map(VentaListadoMapper::toListadoDTO).collect(Collectors.toList());
    }

    public static VentaListadoDTO toListadoDTO(Venta venta) {
        VentaListadoDTO dto = new VentaListadoDTO();
        dto.setIdVenta(venta.getIdVenta());
        dto.setFechaVenta(venta.getFechaVenta());
        dto.setTotalVentas(venta.getTotalVentas());
        dto.setMetodoPago(venta.getMetodoPago());
        dto.setTipoComprobante(venta.getTipoComprobante());
        dto.setUsuario(toUsuarioDTO(venta.getUsuario()));
        dto.setCliente(toClienteDTO(venta.getCliente()));
        dto.setDetalles(toDetalleDTOs(venta.getDetalles()));
        return dto;
    }

    private static UsuarioVentaDTO toUsuarioDTO(Usuario usuario) {
        if (usuario == null) {
            return null;
        }
        UsuarioVentaDTO dto = new UsuarioVentaDTO();
        dto.setId(usuario.getId());
        dto.setUsuario(usuario.getUsuario());
        return dto;
    }

    private static ClienteVentaDTO toClienteDTO(Cliente cliente) {
        if (cliente == null) {
            return null;
        }
        ClienteVentaDTO dto = new ClienteVentaDTO();
        dto.setIdCliente(cliente.getIdCliente());
        dto.setNombreCliente(cliente.getNombreCliente());
        dto.setNumeroDocumento(cliente.getNumeroDocumento());
        dto.setTipoCliente(cliente.getTipoCliente());
        return dto;
    }

    private static List<DetalleVentaListadoDTO> toDetalleDTOs(List<DetalleVenta> detalles) {
        if (detalles == null || detalles.isEmpty()) {
            return Collections.emptyList();
        }
        return detalles.stream().map(VentaListadoMapper::toDetalleDTO).collect(Collectors.toList());
    }

    private static DetalleVentaListadoDTO toDetalleDTO(DetalleVenta detalle) {
        DetalleVentaListadoDTO dto = new DetalleVentaListadoDTO();
        dto.setIdDetalleVenta(detalle.getIdDetalleVenta());
        dto.setCantidad(detalle.getCantidad());
        dto.setPrecioUnitario(detalle.getPrecioUnitario());
        dto.setProductoVariante(toVarianteDTO(detalle.getProductoVariante()));
        return dto;
    }

    private static ProductoVarianteVentaDTO toVarianteDTO(ProductoVariante variante) {
        if (variante == null) {
            return null;
        }
        ProductoVarianteVentaDTO dto = new ProductoVarianteVentaDTO();
        dto.setIdProductoVariante(variante.getIdProductoVariante());
        dto.setColor(variante.getColor());
        dto.setTalla(variante.getTalla());
        dto.setSku(variante.getSku());
        dto.setProducto(toProductoDTO(variante.getProducto()));
        return dto;
    }

    private static ProductoVentaDTO toProductoDTO(Producto producto) {
        if (producto == null) {
            return null;
        }
        ProductoVentaDTO dto = new ProductoVentaDTO();
        dto.setIdProducto(producto.getIdProducto());
        dto.setNombre(producto.getNombre());
        dto.setCodigoIdentificacion(producto.getCodigoIdentificacion());
        return dto;
    }
}
