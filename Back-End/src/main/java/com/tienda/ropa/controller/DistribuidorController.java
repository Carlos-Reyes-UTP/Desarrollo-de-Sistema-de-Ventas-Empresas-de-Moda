package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Distribuidor;
import com.tienda.ropa.service.DistribuidorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/distribuidores")
public class DistribuidorController {

    @Autowired
    private DistribuidorService distribuidorService;

    @PostMapping
    public Distribuidor crearDistribuidor(@RequestBody Distribuidor distribuidor) {
        return distribuidorService.crearDistribuidor(distribuidor);
    }

    @PutMapping("/{id}")
    public Distribuidor editarDistribuidor(@PathVariable Long id, @RequestBody Distribuidor distribuidorActualizado) {
        return distribuidorService.editarDistribuidor(id, distribuidorActualizado);
    }

    @DeleteMapping("/{id}")
    public void eliminarDistribuidor(@PathVariable Long id) {
        distribuidorService.eliminarDistribuidor(id);
    }

    @GetMapping
    public List<Distribuidor> obtenerDistribuidores() {
        return distribuidorService.obtenerDistribuidores();
    }

    @GetMapping("/nombre/{nombre}")
    public Optional<Distribuidor> obtenerDistribuidorPorNombre(@PathVariable String nombre) {
        return distribuidorService.obtenerDistribuidorPorNombre(nombre);
    }

    @GetMapping("/{id}")
    public Optional<Distribuidor> obtenerDistribuidorPorId(@PathVariable Long id) {
        return distribuidorService.obtenerDistribuidorPorId(id);
    }
}