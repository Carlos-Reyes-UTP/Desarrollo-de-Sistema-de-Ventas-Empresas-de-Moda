package com.tienda.ropa.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.InventarioContextoDTO;
import com.tienda.ropa.dto.ResumenStockAreaDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.InventarioContextService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/almacenero/inventario")
@RequiredArgsConstructor
public class InventarioContextController {

    private final InventarioContextService inventarioContextService;

    @GetMapping("/mi-contexto")
    public InventarioContextoDTO miContexto(@AuthenticationPrincipal Usuario usuario) {
        return inventarioContextService.construirContexto(usuario);
    }

    @GetMapping("/resumen-areas")
    public List<ResumenStockAreaDTO> resumenAreas() {
        return inventarioContextService.resumenStockAreasAlmacen();
    }
}
