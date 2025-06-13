package com.tienda.ropa.service;

import com.tienda.ropa.entity.Color;
import java.util.List;
import java.util.Optional;

public interface ColorService {
    // Obtener todos los colores
    List<Color> getAllColores();

    // Obtener color por ID
    Optional<Color> getColorById(Long id);

    // Buscar colores por nombre
    List<Color> buscarColores(String nombre);

    // Crear nuevo color
    Color createColor(Color color);

    // Actualizar color
    Color updateColor(Long id, Color color);

    // Eliminar color
    void deleteColor(Long id);
} 