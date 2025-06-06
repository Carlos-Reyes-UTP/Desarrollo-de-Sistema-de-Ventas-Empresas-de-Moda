package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Comprador;
import com.tienda.ropa.service.CompradorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/compradores")
public class CompradorController {

    @Autowired
    private CompradorService compradorService;

    @PostMapping
    public Comprador crearComprador(@RequestBody Comprador comprador) {
        return compradorService.agregarComprador(comprador);
    }

    @GetMapping("/{id}")
    public Optional<Comprador> obtenerCompradorPorId(@PathVariable Long id) {
        return compradorService.obtenerCompradorPorId(id);
    }
}