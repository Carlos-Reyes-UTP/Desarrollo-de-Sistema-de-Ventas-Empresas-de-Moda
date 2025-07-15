package com.tienda.ropa.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.ProductoMasVendidoDTO;
import com.tienda.ropa.dto.ReportePorCategoriaDTO;
import com.tienda.ropa.dto.TallaProductoDTO;
import com.tienda.ropa.dto.VariantesPorColorDTO;
import com.tienda.ropa.service.ReporteService;

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
            @RequestParam(defaultValue = "10") int limite,
            @RequestParam(required = false) Long idCategoriaPadre,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ProductoMasVendidoDTO> productos;
            
            // Si se proporcionan fechas, usar consulta con filtro de fecha
            if (fechaInicio != null && fechaFin != null) {
                if (idCategoriaPadre != null) {
                    productos = reporteService.obtenerProductosMasVendidosPorCategoriaPadreYFecha(idCategoriaPadre, fechaInicio, fechaFin, limite);
                } else {
                    productos = reporteService.obtenerProductosMasVendidosPorFecha(fechaInicio, fechaFin, limite);
                }
            } else {
                // Sin filtro de fecha
                if (idCategoriaPadre != null) {
                    productos = reporteService.obtenerProductosMasVendidosPorCategoriaPadre(idCategoriaPadre, limite);
                } else {
                    productos = reporteService.obtenerProductosMasVendidos(limite);
                }
            }
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

    // Endpoint para obtener subcategorías de una categoría padre específica
    @GetMapping("/por-categoria/subcategorias")
    public ResponseEntity<List<ReportePorCategoriaDTO>> obtenerReportePorSubcategoria(
            @RequestParam Long idCategoriaPadre,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ReportePorCategoriaDTO> reporte;
            if (fechaInicio != null && fechaFin != null) {
                reporte = reporteService.obtenerReportePorSubcategoriaEntreFechas(idCategoriaPadre, fechaInicio, fechaFin);
            } else {
                reporte = reporteService.obtenerReportePorSubcategoria(idCategoriaPadre);
            }
            return ResponseEntity.ok(reporte);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Endpoint para obtener segunda subcategoría de una subcategoría específica
    @GetMapping("/por-categoria/segunda-subcategoria")
    public ResponseEntity<List<ReportePorCategoriaDTO>> obtenerReportePorSegundaSubcategoria(
            @RequestParam Long idSubcategoria,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        try {
            List<ReportePorCategoriaDTO> reporte;
            if (fechaInicio != null && fechaFin != null) {
                reporte = reporteService.obtenerReportePorSegundaSubcategoriaEntreFechas(idSubcategoria, fechaInicio, fechaFin);
            } else {
                reporte = reporteService.obtenerReportePorSegundaSubcategoria(idSubcategoria);
            }
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
                            : reporteService.obtenerReportePorCategoria());

            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Endpoint para obtener tallas de un producto específico
    @GetMapping("/producto/tallas")
    public ResponseEntity<List<TallaProductoDTO>> obtenerTallasPorProducto(
            @RequestParam Long idProducto) {
        try {
            List<TallaProductoDTO> tallas = reporteService.obtenerTallasPorProducto(idProducto);
            return ResponseEntity.ok(tallas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Endpoint para obtener variantes por color de un producto y talla específicos
    @GetMapping("/producto/variantes-por-color")
    public ResponseEntity<List<VariantesPorColorDTO>> obtenerVariantesPorColor(
            @RequestParam Long idProducto,
            @RequestParam Long idTalla) {
        try {
            List<VariantesPorColorDTO> variantes = reporteService.obtenerVariantesPorColor(idProducto, idTalla);
            return ResponseEntity.ok(variantes);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
