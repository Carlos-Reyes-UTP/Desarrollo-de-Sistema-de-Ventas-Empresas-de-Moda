package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Proveedores;

import com.tienda.ropa.service.ProveedoresService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/almacenero/proveedores")
public class ProveedoresController {

    @Autowired
    private ProveedoresService proveedoresService;

    @PostMapping
    public Proveedores crearProveedor(@RequestBody Proveedores proveedor) {
        return proveedoresService.crearProveedor(proveedor);
    }

    @PutMapping("/{id}")
    public Proveedores editarProveedor(@PathVariable Long id, @RequestBody Proveedores proveedorActualizado) {
        return proveedoresService.editarProveedor(id, proveedorActualizado);
    }

    @DeleteMapping("/{id}")
    public void eliminarProveedor(@PathVariable Long id) {
        proveedoresService.eliminarProveedor(id);
    }

    @GetMapping
    public List<Proveedores> obtenerProveedores() {
        return proveedoresService.obtenerProveedores();
    }

    @GetMapping("/nombre/{nombre}")
    public Optional<Proveedores> obtenerPPorNombre(@PathVariable String nombre) {
        return proveedoresService.obtenerProveedorPorNombre(nombre);
    }

    @GetMapping("/{id}")
    public Optional<Proveedores> obtenerDistribuidorPorId(@PathVariable Long id) {
        return proveedoresService.obtenerProveedorPorId(id);
    }
}