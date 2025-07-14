package com.tienda.ropa.controller;

import com.tienda.ropa.dto.*;
import com.tienda.ropa.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reportes")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class ReporteController {
    
    @Autowired
    private ReporteService reporteService;
    
    // Endpoints para productos más vendidos
    @GetMapping("/productos-mas-vendidos")
    public ResponseEntity<List<ProductoMasVendidoDTO>> obtenerProductosMasVendidos(
            @RequestParam(defaultValue = "10") int limite) {
        try {
            List<ProductoMasVendidoDTO> productos = reporteService.obtenerProductosMasVendidos(limite);
            return ResponseEntity.ok(productos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/productos-mas-vendidos/por-fecha")
    public ResponseEntity<List<ProductoMasVendidoDTO>> obtenerProductosMasVendidosPorFecha(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin,
            @RequestParam(defaultValue = "10") int limite) {
        try {
            List<ProductoMasVendidoDTO> productos = reporteService.obtenerProductosMasVendidosPorFecha(
                fechaInicio, fechaFin, limite);
            return ResponseEntity.ok(productos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Endpoints para reportes por categoría
    @GetMapping("/por-categoria")
    public ResponseEntity<List<ReportePorCategoriaDTO>> obtenerReportePorCategoria() {
        try {
            List<ReportePorCategoriaDTO> reporte = reporteService.obtenerReportePorCategoria();
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/por-categoria/por-fecha")
    public ResponseEntity<List<ReportePorCategoriaDTO>> obtenerReportePorCategoriaEntreFechas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ReportePorCategoriaDTO> reporte = reporteService.obtenerReportePorCategoriaEntreFechas(
                fechaInicio, fechaFin);
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Endpoints para reportes por color
    @GetMapping("/por-color")
    public ResponseEntity<List<ReportePorColorDTO>> obtenerReportePorColor() {
        try {
            List<ReportePorColorDTO> reporte = reporteService.obtenerReportePorColor();
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/por-color/por-fecha")
    public ResponseEntity<List<ReportePorColorDTO>> obtenerReportePorColorEntreFechas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ReportePorColorDTO> reporte = reporteService.obtenerReportePorColorEntreFechas(
                fechaInicio, fechaFin);
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Endpoints para reportes por talla
    @GetMapping("/por-talla")
    public ResponseEntity<List<ReportePorTallaDTO>> obtenerReportePorTalla() {
        try {
            List<ReportePorTallaDTO> reporte = reporteService.obtenerReportePorTalla();
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/por-talla/por-fecha")
    public ResponseEntity<List<ReportePorTallaDTO>> obtenerReportePorTallaEntreFechas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ReportePorTallaDTO> reporte = reporteService.obtenerReportePorTallaEntreFechas(
                fechaInicio, fechaFin);
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Endpoint combinado para obtener todos los reportes
    @GetMapping("/resumen-completo")
    public ResponseEntity<Map<String, Object>> obtenerResumenCompleto(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin,
            @RequestParam(defaultValue = "5") int limite) {
        try {
            Map<String, Object> resumen = Map.of(
                "productosMasVendidos", fechaInicio != null && fechaFin != null 
                    ? reporteService.obtenerProductosMasVendidosPorFecha(fechaInicio, fechaFin, limite)
                    : reporteService.obtenerProductosMasVendidos(limite),
                "reportePorCategoria", fechaInicio != null && fechaFin != null
                    ? reporteService.obtenerReportePorCategoriaEntreFechas(fechaInicio, fechaFin)
                    : reporteService.obtenerReportePorCategoria(),
                "reportePorColor", fechaInicio != null && fechaFin != null
                    ? reporteService.obtenerReportePorColorEntreFechas(fechaInicio, fechaFin)
                    : reporteService.obtenerReportePorColor(),
                "reportePorTalla", fechaInicio != null && fechaFin != null
                    ? reporteService.obtenerReportePorTallaEntreFechas(fechaInicio, fechaFin)
                    : reporteService.obtenerReportePorTalla()
            );
            
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
