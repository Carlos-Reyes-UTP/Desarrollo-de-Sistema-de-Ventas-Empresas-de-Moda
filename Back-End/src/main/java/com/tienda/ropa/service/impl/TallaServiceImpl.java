package com.tienda.ropa.service.impl;

import com.tienda.ropa.entity.Talla;
import com.tienda.ropa.repository.TallaRepository;
import com.tienda.ropa.service.TallaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class TallaServiceImpl implements TallaService {

    @Autowired
    private TallaRepository tallaRepository;

    @Override
    public List<Talla> getAllTallas() {
        return tallaRepository.findAll();
    }

    @Override
    public List<Talla> getTallasOrdenadas() {
        return tallaRepository.findAll().stream()
                .sorted((t1, t2) -> t1.getNombreTalla().compareTo(t2.getNombreTalla()))
                .toList();
    }

    @Override
    public Optional<Talla> getTallaById(Long id) {
        return tallaRepository.findById(id);
    }

    @Override
    public List<Talla> buscarTallas(String nombre) {
        return tallaRepository.findByNombreTallaContainingIgnoreCase(nombre);
    }

    @Override
    public boolean existeTalla(String nombreTalla) {
        return tallaRepository.existsByNombreTalla(nombreTalla);
    }

    @Override
    @Transactional
    public Talla createTalla(Talla talla) {
        if (existeTalla(talla.getNombreTalla())) {
            throw new IllegalArgumentException("Ya existe una talla con el nombre: " + talla.getNombreTalla());
        }
        return tallaRepository.save(talla);
    }

    @Override
    @Transactional
    public Talla updateTalla(Long id, Talla talla) {
        Talla tallaExistente = tallaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe una talla con el ID: " + id));

        // Verificar si el nuevo nombre ya existe en otra talla
        if (!tallaExistente.getNombreTalla().equals(talla.getNombreTalla()) && 
            existeTalla(talla.getNombreTalla())) {
            throw new IllegalArgumentException("Ya existe una talla con el nombre: " + talla.getNombreTalla());
        }

        tallaExistente.setNombreTalla(talla.getNombreTalla());
        tallaExistente.setDescripcion(talla.getDescripcion());
        
        return tallaRepository.save(tallaExistente);
    }

    @Override
    @Transactional
    public void deleteTalla(Long id) {
        Talla talla = tallaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe una talla con el ID: " + id));


        tallaRepository.delete(talla);
    }
} 