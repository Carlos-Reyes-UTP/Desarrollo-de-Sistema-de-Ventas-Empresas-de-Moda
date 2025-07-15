package com.tienda.ropa.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.tienda.ropa.dto.ProductoMasVendidoDTO;
import com.tienda.ropa.dto.ReportePorCategoriaDTO;
import com.tienda.ropa.dto.TallaProductoDTO;
import com.tienda.ropa.dto.VariantesPorColorDTO;
import com.tienda.ropa.repository.ReporteRepository;

@Service
public class ReporteService {

    @Autowired
    private ReporteRepository reporteRepository;

    // Reportes de productos más vendidos
    public List<ProductoMasVendidoDTO> obtenerProductosMasVendidos(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return reporteRepository.findProductosMasVendidos(pageable);
    }

    public List<ProductoMasVendidoDTO> obtenerProductosMasVendidosPorFecha(
            LocalDateTime fechaInicio, LocalDateTime fechaFin, int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return reporteRepository.findProductosMasVendidosPorFecha(
                fechaInicio, fechaFin, pageable);
    }

    // Reportes por categoría
    public List<ReportePorCategoriaDTO> obtenerReportePorCategoria() {
        List<ReportePorCategoriaDTO> reporte = reporteRepository.findReportePorCategoria();

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }

    public List<ReportePorCategoriaDTO> obtenerReportePorCategoriaEntreFechas(
            LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        List<ReportePorCategoriaDTO> reporte = reporteRepository
                .findReportePorCategoriaEntreFechas(fechaInicio, fechaFin);

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }

    public List<ProductoMasVendidoDTO> obtenerProductosMasVendidosPorCategoriaPadre(Long idCategoriaPadre, int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return reporteRepository.findProductosMasVendidosPorCategoriaPadre(idCategoriaPadre, pageable);
    }

    public List<ProductoMasVendidoDTO> obtenerProductosMasVendidosPorCategoriaPadreYFecha(
            Long idCategoriaPadre, LocalDateTime fechaInicio, LocalDateTime fechaFin, int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return reporteRepository.findProductosMasVendidosPorCategoriaPadreYFecha(
                idCategoriaPadre, fechaInicio, fechaFin, pageable);
    }

    // Obtener tallas disponibles para un producto específico
    public List<TallaProductoDTO> obtenerTallasPorProducto(Long idProducto) {
        return reporteRepository.findTallasByProductoId(idProducto);
    }

    // Obtener variantes agrupadas por color para un producto y talla específicos
    public List<VariantesPorColorDTO> obtenerVariantesPorColor(Long idProducto, Long idTalla) {
        return reporteRepository.findVariantesPorColorByProductoAndTalla(idProducto, idTalla);
    }

    // Reportes por subcategoría (hijos de una categoría padre)
    public List<ReportePorCategoriaDTO> obtenerReportePorSubcategoria(Long idCategoriaPadre) {
        List<ReportePorCategoriaDTO> reporte = reporteRepository.findReportePorSubcategoria(idCategoriaPadre);

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }

    public List<ReportePorCategoriaDTO> obtenerReportePorSubcategoriaEntreFechas(
            Long idCategoriaPadre, LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        List<ReportePorCategoriaDTO> reporte = reporteRepository
                .findReportePorSubcategoriaEntreFechas(idCategoriaPadre, fechaInicio, fechaFin);

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }

    // Reportes por segunda subcategoría (hijos de una subcategoría)
    public List<ReportePorCategoriaDTO> obtenerReportePorSegundaSubcategoria(Long idSubcategoria) {
        List<ReportePorCategoriaDTO> reporte = reporteRepository.findReportePorSegundaSubcategoria(idSubcategoria);

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }

    public List<ReportePorCategoriaDTO> obtenerReportePorSegundaSubcategoriaEntreFechas(
            Long idSubcategoria, LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        List<ReportePorCategoriaDTO> reporte = reporteRepository
                .findReportePorSegundaSubcategoriaEntreFechas(idSubcategoria, fechaInicio, fechaFin);

        // Calcular porcentajes
        BigDecimal totalIngresos = reporte.stream()
                .map(ReportePorCategoriaDTO::getIngresosTotales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        reporte.forEach(item -> {
            if (totalIngresos.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal porcentaje = item.getIngresosTotales()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalIngresos, 2, RoundingMode.HALF_UP);
                item.setPorcentajeDelTotal(porcentaje);
            }
        });

        return reporte;
    }
}
