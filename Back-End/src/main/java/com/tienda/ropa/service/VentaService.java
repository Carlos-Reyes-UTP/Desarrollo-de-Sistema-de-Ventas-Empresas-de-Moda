package com.tienda.ropa.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.repository.DetalleVentaRepository;
import com.tienda.ropa.repository.VentaRepository;

@Service
public class VentaService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private DetalleVentaRepository detalleVentaRepository;

    public List<Venta> obtenerVentas() {
        return ventaRepository.findAll();
    }

    public Optional<Venta> obtenerVentaPorId(Long id) {
        return ventaRepository.findById(id);
    }

    @Transactional
    public Venta registrarVenta(Venta venta) {
        BigDecimal totalVenta = BigDecimal.ZERO;
        for (DetalleVenta detalle : venta.getDetalles()) {
            totalVenta = totalVenta.add(detalle.getSubtotal());
            detalle.setVenta(venta);
        }
        venta.setTotalVentas(totalVenta);

        Venta ventaGuardada = ventaRepository.save(venta);
        detalleVentaRepository.saveAll(venta.getDetalles());

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