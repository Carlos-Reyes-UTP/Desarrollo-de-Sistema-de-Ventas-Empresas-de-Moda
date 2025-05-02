package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Venta;
import com.tienda.ropa.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/ventas")
public class VentaController {

    @Autowired
    private VentaService ventaService;

    @PostMapping
    public Venta crearVenta(@RequestBody Venta venta) {
        return ventaService.registrarVenta(venta);
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
        LocalDate fechaVenta = LocalDate.parse(fecha);
        return ventaService.obtenerVentaPorFecha(fechaVenta);
    }

    @GetMapping("/cliente/{idCliente}")
    public List<Venta> obtenerVentaPorIdComprador(@PathVariable Long idCliente) {
        return ventaService.obtenerVentaPorIdComprador(idCliente);
    }

    @GetMapping("/{id}/detalles")
    public Optional<Venta> obtenerVentaConDetalles(@PathVariable Long id) {
        return ventaService.obtenerVentaConDetalles(id);
    }
}