package com.tienda.ropa.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.dto.OrigenVentaResult;
import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.OrigenVenta;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.repository.DetalleVentaRepository;
import com.tienda.ropa.repository.VentaRepository;

@Service
public class VentaService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private DetalleVentaRepository detalleVentaRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private ReposicionAutomaticaService reposicionAutomaticaService;

    @Autowired
    private NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<Venta> obtenerVentas() {
        return ventaRepository.findAllWithDetalles();
    }

    public Optional<Venta> obtenerVentaPorId(Long id) {
        return ventaRepository.findById(id);
    }

    @Transactional
    public Venta registrarVenta(Venta venta) {
        BigDecimal totalVenta = BigDecimal.ZERO;
        for (DetalleVenta detalle : venta.getDetalles()) {
            detalle.setVenta(venta);
            totalVenta = totalVenta.add(detalle.getSubtotal());

            Long idVariante = detalle.getProductoVariante().getIdProductoVariante();
            OrigenVentaResult origenResult = inventarioService.resolverUbicacionAreaDeVentaConFallback(
                    idVariante, detalle.getCantidad());
            UbicacionArea ubicacionAreaVenta = origenResult.ubicacionArea();

            inventarioService.aplicarDeltaEnUbicacionArea(
                    idVariante,
                    ubicacionAreaVenta,
                    -detalle.getCantidad(),
                    "Stock insuficiente en la ubicación de venta: "
                            + InventarioService.etiquetaUbicacionArea(ubicacionAreaVenta));

            detalle.setOrigenVenta(origenResult.tipoOrigen());

            if (origenResult.tipoOrigen() == OrigenVenta.PISO) {
                reposicionAutomaticaService.evaluarTrasSalidaEnUbicacionArea(
                        idVariante, ubicacionAreaVenta.getIdUbicacionArea());
            } else {
                reposicionAutomaticaService.evaluarTrasVentaDirectaDesdeAlmacen(
                        idVariante, ubicacionAreaVenta.getIdUbicacionArea());
            }
        }
        venta.setTotalVentas(totalVenta);

        Venta ventaGuardada = ventaRepository.save(venta);
        List<DetalleVenta> detallesGuardados = detalleVentaRepository.saveAll(venta.getDetalles());
        ventaGuardada.setDetalles(detallesGuardados);

        // Enviar notificación en tiempo real a los clientes conectados
        notificationService.sendNotificationObject(
            java.util.Map.of(
                "type", "NUEVA_VENTA",
                "message", "Se ha registrado una nueva venta por S/." + ventaGuardada.getTotalVentas(),
                "idVenta", ventaGuardada.getIdVenta()
            )
        );

        return ventaGuardada;
    }

    public List<Venta> obtenerVentaPorFecha(LocalDate fecha) {
        return ventaRepository.findByFechaVenta(fecha);
    }

    public List<Venta> obtenerVentaPorRangoFecha(LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return ventaRepository.findByFechaVentaBetween(fechaInicio, fechaFin);
    }

    public List<Venta> getVentasByClienteId(Long clienteId) {
        return ventaRepository.findByClienteIdCliente(clienteId);
    }

    @Transactional(readOnly = true)
    public Optional<Venta> obtenerVentaConDetalles(Long idVenta) {
        return ventaRepository.findById(idVenta);
    }
}