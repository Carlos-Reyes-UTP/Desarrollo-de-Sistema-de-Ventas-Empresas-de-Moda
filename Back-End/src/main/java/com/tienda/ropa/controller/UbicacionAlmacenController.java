package com.tienda.ropa.controller;

import com.tienda.ropa.dto.AreaStockResumenDTO;
import com.tienda.ropa.dto.StockDesdeAlmacenDTO;
import com.tienda.ropa.dto.StockUbicacionDTO;
import com.tienda.ropa.dto.UbicacionDTO;
import com.tienda.ropa.service.UbicacionAlmacenService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints de lectura para la UI almacenera: pisos, áreas, orígenes posibles
 * de traslado y stock por ubicación.
 */
@RestController
@RequestMapping("/api/almacenero/ubicaciones")
@RequiredArgsConstructor
public class UbicacionAlmacenController {

    private final UbicacionAlmacenService ubicacionAlmacenService;

    @GetMapping("/stock/almacen")
    public StockDesdeAlmacenDTO stockDesdeAlmacen() {
        return ubicacionAlmacenService.stockDesdeAlmacen();
    }

    @GetMapping("/stock/almacen/buscar")
    public List<StockUbicacionDTO> buscarStockOrigenTraslado(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", defaultValue = "30") int limit,
            @RequestParam(value = "soloAlmacen", defaultValue = "false") boolean soloAlmacen) {
        return ubicacionAlmacenService.buscarStockOrigenDistribucion(q, limit, soloAlmacen);
    }

    @GetMapping("/pisos")
    public List<String> listarPisos() {
        return ubicacionAlmacenService.listarPisos();
    }

    @GetMapping("/pisos/{nombrePiso}/areas")
    public List<UbicacionDTO> listarAreasDePiso(@PathVariable String nombrePiso) {
        return ubicacionAlmacenService.listarAreasDePiso(nombrePiso);
    }

    @GetMapping("/pisos/{nombrePiso}/resumen-stock")
    public List<AreaStockResumenDTO> resumenStockAreasDePiso(@PathVariable String nombrePiso) {
        return ubicacionAlmacenService.resumenStockAreasDePiso(nombrePiso);
    }

    @GetMapping("/origenes")
    public List<UbicacionDTO> listarOrigenesPosibles(@RequestParam("destino") Long idDestino) {
        return ubicacionAlmacenService.listarOrigenesPosibles(idDestino);
    }

    @GetMapping("/{idUbicacion}/stock")
    public List<StockUbicacionDTO> stockPorUbicacion(@PathVariable Long idUbicacion) {
        return ubicacionAlmacenService.stockPorUbicacion(idUbicacion);
    }
}
