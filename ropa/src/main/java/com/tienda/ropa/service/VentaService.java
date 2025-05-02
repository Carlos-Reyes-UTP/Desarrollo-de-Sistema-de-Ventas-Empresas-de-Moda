package com.tienda.ropa.service;

import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.repository.VentaRepository;
import com.tienda.ropa.repository.DetalleVentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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
        venta.setTotalVenta(totalVenta);

        Venta ventaGuardada = ventaRepository.save(venta);
        detalleVentaRepository.saveAll(venta.getDetalles());

        return ventaGuardada;
    }

    public List<Venta> obtenerVentaPorFecha(LocalDate fecha) {
        return ventaRepository.findByFechaVenta(fecha);
    }

    public List<Venta> obtenerVentaPorIdComprador(Long idComprador) {
        return ventaRepository.findByComprador_IdComprador(idComprador);
    }

    @Transactional(readOnly = true)
    public Optional<Venta> obtenerVentaConDetalles(Long idVenta) {
        return ventaRepository.findById(idVenta);
    }
}