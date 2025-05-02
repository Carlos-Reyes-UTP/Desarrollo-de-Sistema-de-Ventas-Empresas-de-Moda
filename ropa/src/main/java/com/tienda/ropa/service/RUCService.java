package com.tienda.ropa.service;

import com.tienda.ropa.entity.RUC;
import com.tienda.ropa.repository.RUCRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RUCService {

    @Autowired
    private RUCRepository rucRepository;

    public RUC agregarRUC(RUC ruc) {
        return rucRepository.save(ruc);
    }

    public Optional<RUC> buscarPorNumeroRUC(String numeroRuc) {
        return rucRepository.findByNumeroRuc(numeroRuc);
    }
}