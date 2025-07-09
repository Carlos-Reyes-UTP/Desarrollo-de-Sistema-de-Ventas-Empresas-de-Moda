package com.tienda.ropa.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.repository.ClienteRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.service.VentaService;

@RestController
@RequestMapping("/api/cajero/ventas")
public class VentaController {

    private final VentaService ventaService;
    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ProductoVarianteRepository productoVarianteRepository;
    
    public VentaController(VentaService ventaService, 
                          UsuarioRepository usuarioRepository,
                          ClienteRepository clienteRepository,
                          ProductoVarianteRepository productoVarianteRepository) {
        this.ventaService = ventaService;
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.productoVarianteRepository = productoVarianteRepository;
    }

    @SuppressWarnings("unchecked")
    @PostMapping
    public Venta crearVenta(@RequestBody Map<String, Object> ventaInput) {
        // Extraer datos del mapa de entrada
        Map<String, Object> clienteInput = (Map<String, Object>) ventaInput.get("cliente");
        Map<String, Object> metodoPagoInput = (Map<String, Object>) ventaInput.get("metodoPago");
        String tipoComprobante = (String) ventaInput.get("tipoComprobante");
        String fechaVenta = (String) ventaInput.get("fechaVenta");
        List<Map<String, Object>> detallesInput = (List<Map<String, Object>>) ventaInput.get("detalles");
        
        // Crear entidad Venta
        Venta venta = new Venta();
        
        // Obtener usuario actual desde el contexto de seguridad (autenticación)
        Usuario usuario = obtenerUsuarioActualDesdeContexto();
        venta.setUsuario(usuario);
        
        // Obtener y asignar cliente
        Long clienteId = Long.valueOf(clienteInput.get("idCliente").toString());
        Cliente cliente = clienteRepository.findById(clienteId)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        venta.setCliente(cliente);
        
        // Asignar método de pago como string (ajustar según necesidad)
        Long metodoPagoId = Long.valueOf(metodoPagoInput.get("idMetodoPago").toString());
        String metodoPagoString = mapearMetodoPago(metodoPagoId);
        venta.setMetodoPago(metodoPagoString);
        
        // Asignar otros campos
        venta.setTipoComprobante(tipoComprobante);
        
        // Parsear fecha con hora usando el formato ISO estándar
        // Formato esperado: "2025-07-09T06:09:52.314" o "2025-07-09T06:09:52"
        LocalDateTime fechaVentaDateTime;
        try {
            // Primero intentar con milisegundos
            fechaVentaDateTime = LocalDateTime.parse(fechaVenta);
        } catch (Exception e) {
            // Si falla, intentar con formato personalizado sin 'T'
            // Formato: "2025-07-09 06:09:52.314" o "2025-07-09 06:09:52"
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
                fechaVentaDateTime = LocalDateTime.parse(fechaVenta, formatter);
            } catch (Exception e2) {
                try {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    fechaVentaDateTime = LocalDateTime.parse(fechaVenta, formatter);
                } catch (Exception e3) {
                    // Como último recurso, usar la fecha actual
                    fechaVentaDateTime = LocalDateTime.now();
                }
            }
        }
        venta.setFechaVenta(fechaVentaDateTime);
        
        // Crear detalles de venta
        List<DetalleVenta> detalles = detallesInput.stream().map(detalleInput -> {
            DetalleVenta detalle = new DetalleVenta();
            
            Map<String, Object> productoVarianteInput = (Map<String, Object>) detalleInput.get("productoVariante");
            Long productoVarianteId = Long.valueOf(productoVarianteInput.get("idProductoVariante").toString());
            ProductoVariante productoVariante = productoVarianteRepository.findById(productoVarianteId)
                .orElseThrow(() -> new RuntimeException("Producto variante no encontrado"));
            
            detalle.setProductoVariante(productoVariante);
            detalle.setCantidad(Integer.valueOf(detalleInput.get("cantidad").toString()));
            detalle.setPrecioUnitario(new BigDecimal(detalleInput.get("precioUnitario").toString()));
            
            return detalle;
        }).toList();
        
        venta.setDetalles(detalles);
        
        return ventaService.registrarVenta(venta);
    }
    
    private String mapearMetodoPago(Long metodoPagoId) {
        return switch (metodoPagoId.intValue()) {
            case 1 -> "EFECTIVO";
            case 2 -> "TARJETA";
            case 3 -> "YAPE";
            case 4 -> "PLIN";
            default -> "EFECTIVO";
        };
    }

    @GetMapping
    public List<Venta> obtenerVentas() {
        return ventaService.obtenerVentas();
    }

    @GetMapping("/{id}")
    public Optional<Venta> obtenerVentaPorId(@PathVariable Long id) {
        return ventaService.obtenerVentaPorId(id);
    }

    @GetMapping("/fecha/{fecha}")
    public List<Venta> obtenerVentaPorFecha(@PathVariable String fecha) {
        // Parsear la fecha sin hora para buscar todas las ventas de ese día
        LocalDateTime fechaInicio = LocalDateTime.parse(fecha + "T00:00:00");
        LocalDateTime fechaFin = LocalDateTime.parse(fecha + "T23:59:59");
        return ventaService.obtenerVentaPorRangoFecha(fechaInicio, fechaFin);
    }

    @GetMapping("/cliente/{clienteId}")
    public List<Venta> getVentasByClienteId(@PathVariable Long clienteId) {
        return ventaService.getVentasByClienteId(clienteId);
    }

    @GetMapping("/{id}/detalles")
    public Optional<Venta> obtenerVentaConDetalles(@PathVariable Long id) {
        return ventaService.obtenerVentaConDetalles(id);
    }

    /**
     * Obtiene el usuario actual basándose en el contexto de seguridad
     */
    @GetMapping("/usuario-actual")
    public Map<String, Object> obtenerUsuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String nombreUsuario = authentication.getName();
        
        Usuario usuario = usuarioRepository.findByUsuario(nombreUsuario)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + nombreUsuario));
        
        return Map.of(
            "id", usuario.getId(),
            "usuario", usuario.getUsuario()
        );
    }

    /**
     * Método helper para obtener el usuario actual desde el contexto de seguridad
     */
    private Usuario obtenerUsuarioActualDesdeContexto() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String nombreUsuario = authentication.getName();
        
        return usuarioRepository.findByUsuario(nombreUsuario)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + nombreUsuario));
    }
}