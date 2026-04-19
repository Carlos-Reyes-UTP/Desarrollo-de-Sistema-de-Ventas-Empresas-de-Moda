package com.tienda.ropa.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.service.DashboardService;

@RestController
@RequestMapping("/api/almacenero/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticasGenerales() {
        return ResponseEntity.ok(dashboardService.obtenerEstadisticasGenerales());
    }

    @GetMapping("/distribucion-categorias")
    public ResponseEntity<List<Map<String, Object>>> obtenerDistribucionCategorias() {
        return ResponseEntity.ok(dashboardService.obtenerDistribucionCategorias());
    }

    @GetMapping("/estado-inventario")
    public ResponseEntity<Map<String, Object>> obtenerEstadoInventario() {
        return ResponseEntity.ok(dashboardService.obtenerEstadoInventario());
    }
}
