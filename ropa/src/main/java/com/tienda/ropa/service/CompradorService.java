package com.tienda.ropa.service;

import com.tienda.ropa.entity.Comprador;
import com.tienda.ropa.repository.CompradorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CompradorService {

    @Autowired
    private CompradorRepository compradorRepository;

    public Comprador agregarComprador(Comprador comprador) {
        return compradorRepository.save(comprador);
    }

    public Optional<Comprador> obtenerCompradorPorId(Long id) {
        return compradorRepository.findById(id);
    }
}