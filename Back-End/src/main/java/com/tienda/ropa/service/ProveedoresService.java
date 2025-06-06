// ProveedoresService.java - asegurar coherencia
package com.tienda.ropa.service;

import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.repository.ProveedoresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProveedoresService {

    @Autowired
    private ProveedoresRepository proveedoresRepository;

    public Proveedores crearProveedor(Proveedores proveedor) {
        return proveedoresRepository.save(proveedor);
    }

    public Proveedores editarProveedor(Long id, Proveedores proveedorActualizado) {
        return proveedoresRepository.findById(id).map(proveedor -> {
            proveedor.setNombre(proveedorActualizado.getNombre());
            proveedor.setRuc(proveedorActualizado.getRuc());
            return proveedoresRepository.save(proveedor);
        }).orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado con el ID: " + id));
    }

    public void eliminarProveedor(Long id) {
        if (proveedoresRepository.existsById(id)) {
            proveedoresRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Proveedor no encontrado con el ID: " + id);
        }
    }

    public List<Proveedores> obtenerProveedores() {
        return proveedoresRepository.findAll();
    }

    public Optional<Proveedores> obtenerProveedorPorNombre(String nombre) {
        return proveedoresRepository.findByNombre(nombre);
    }

    public Optional<Proveedores> obtenerProveedorPorId(Long id) {
        return proveedoresRepository.findById(id);
    }
}