package com.tienda.ropa.service.impl;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.repository.ColorRepository;
import com.tienda.ropa.service.ColorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ColorServiceImpl implements ColorService {

    @Autowired
    private ColorRepository colorRepository;

    @Override
    public List<Color> getAllColores() {
        return colorRepository.findAll();
    }

    @Override
    public Optional<Color> getColorById(Long id) {
        return colorRepository.findById(id);
    }

    @Override
    public List<Color> buscarColores(String nombre) {
        return colorRepository.findByNombre(nombre).stream().toList();
    }

    @Override
    @Transactional
    public Color createColor(Color color) {
        return colorRepository.save(color);
    }

    @Override
    @Transactional
    public Color updateColor(Long id, Color color) {
        if (!colorRepository.existsById(id)) {
            throw new IllegalArgumentException("No existe un color con el ID: " + id);
        }
        color.setIdColor(id);
        return colorRepository.save(color);
    }

    @Override
    @Transactional
    public void deleteColor(Long id) {
        if (!colorRepository.existsById(id)) {
            throw new IllegalArgumentException("No existe un color con el ID: " + id);
        }
        colorRepository.deleteById(id);
    }
} 