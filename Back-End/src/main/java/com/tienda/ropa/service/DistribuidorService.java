package com.tienda.ropa.service;

import com.tienda.ropa.entity.Distribuidor;
import com.tienda.ropa.repository.DistribuidorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DistribuidorService {

    @Autowired
    private DistribuidorRepository distribuidorRepository;

    public Distribuidor crearDistribuidor(Distribuidor distribuidor) {
        return distribuidorRepository.save(distribuidor);
    }

    public Distribuidor editarDistribuidor(Long id, Distribuidor distribuidorActualizado) {
        return distribuidorRepository.findById(id).map(distribuidor -> {
            distribuidor.setNombre(distribuidorActualizado.getNombre());
            distribuidor.setRuc(distribuidorActualizado.getRuc());
            return distribuidorRepository.save(distribuidor);
        }).orElseThrow(() -> new IllegalArgumentException("Distribuidor no encontrado con el ID: " + id));
    }

    public void eliminarDistribuidor(Long id) {
        if (distribuidorRepository.existsById(id)) {
            distribuidorRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Distribuidor no encontrado con el ID: " + id);
        }
    }

    public List<Distribuidor> obtenerDistribuidores() {
        return distribuidorRepository.findAll();
    }

    public Optional<Distribuidor> obtenerDistribuidorPorNombre(String nombre) {
        return distribuidorRepository.findByNombre(nombre);
    }

    public Optional<Distribuidor> obtenerDistribuidorPorId(Long id) {
        return distribuidorRepository.findById(id);
    }
}