package com.tienda.ropa.controller;

import com.tienda.ropa.dto.AreaStockResumenDTO;
import com.tienda.ropa.dto.StockDesdeAlmacenDTO;
import com.tienda.ropa.dto.StockUbicacionDTO;
import com.tienda.ropa.dto.UbicacionDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.InventarioContextService;
import com.tienda.ropa.service.UbicacionAlmacenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final InventarioContextService inventarioContextService;

    @GetMapping("/areas-almacen")
    public List<UbicacionDTO> listarAreasAlmacen() {
        return inventarioContextService.listarAreasAlmacen();
    }

    @GetMapping("/stock/almacen")
    public StockDesdeAlmacenDTO stockDesdeAlmacen(
            @RequestParam(value = "sector", required = false) String sector,
            @AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.stockDesdeAlmacen(usuario, sector);
    }

    @GetMapping("/stock/almacen/buscar")
    public List<StockUbicacionDTO> buscarStockOrigenTraslado(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", defaultValue = "30") int limit,
            @RequestParam(value = "soloAlmacen", defaultValue = "false") boolean soloAlmacen,
            @RequestParam(value = "sector", required = false) String sector,
            @AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.buscarStockOrigenDistribucion(q, limit, soloAlmacen, usuario, sector);
    }

    @GetMapping("/pisos")
    public List<String> listarPisos(@AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.listarPisos(usuario);
    }

    @GetMapping("/pisos/{nombrePiso}/areas")
    public List<UbicacionDTO> listarAreasDePiso(
            @PathVariable String nombrePiso,
            @AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.listarAreasDePiso(nombrePiso, usuario);
    }

    @GetMapping("/pisos/{nombrePiso}/resumen-stock")
    public List<AreaStockResumenDTO> resumenStockAreasDePiso(
            @PathVariable String nombrePiso,
            @AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.resumenStockAreasDePiso(nombrePiso, usuario);
    }

    @GetMapping("/origenes")
    public List<UbicacionDTO> listarOrigenesPosibles(@RequestParam("destino") Long idDestino) {
        return ubicacionAlmacenService.listarOrigenesPosibles(idDestino);
    }

    @GetMapping("/{idUbicacionArea}/stock")
    public List<StockUbicacionDTO> stockPorUbicacionArea(
            @PathVariable Long idUbicacionArea,
            @AuthenticationPrincipal Usuario usuario) {
        return ubicacionAlmacenService.stockPorUbicacionArea(idUbicacionArea, usuario);
    }
}
