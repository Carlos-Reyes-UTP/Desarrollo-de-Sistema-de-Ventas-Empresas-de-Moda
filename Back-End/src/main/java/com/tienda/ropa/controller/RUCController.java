package com.tienda.ropa.controller;

import com.tienda.ropa.entity.RUC;
import com.tienda.ropa.service.RUCService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/rucs")
public class RUCController {

    @Autowired
    private RUCService rucService;

    @PostMapping
    public RUC crearRUC(@RequestBody RUC ruc) {
        return rucService.agregarRUC(ruc);
    }

    @GetMapping("/{numeroRuc}")
    public Optional<RUC> obtenerRUCPorNumero(@PathVariable String numeroRuc) {
        return rucService.buscarPorNumeroRUC(numeroRuc);
    }
}