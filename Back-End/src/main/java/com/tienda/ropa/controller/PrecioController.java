package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Precio;
import com.tienda.ropa.service.PrecioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/precios")
public class PrecioController {

    @Autowired
    private PrecioService precioService;

    @PostMapping
    public Precio crearPrecio(@RequestBody Precio precio) {
        return precioService.agregarPrecio(precio);
    }

    @GetMapping("/{id}")
    public Optional<Precio> obtenerPrecioPorId(@PathVariable Long id) {
        return precioService.obtenerPrecioPorId(id);
    }

    @GetMapping
    public List<Precio> obtenerTodosLosPrecios() {
        return precioService.obtenerTodosLosPrecios();
    }

    @PutMapping("/{id}")
    public Precio editarPrecio(@PathVariable Long id, @RequestBody Precio precioActualizado) {
        return precioService.editarPrecio(id, precioActualizado);
    }

    @DeleteMapping("/{id}")
    public void eliminarPrecio(@PathVariable Long id) {
        precioService.eliminarPrecio(id);
    }
}