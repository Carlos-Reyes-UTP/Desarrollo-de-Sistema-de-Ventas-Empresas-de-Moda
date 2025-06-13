package com.tienda.ropa.service;

import com.tienda.ropa.entity.Talla;
import java.util.List;
import java.util.Optional;

public interface TallaService {
    // Obtener todas las tallas
    List<Talla> getAllTallas();

    // Obtener tallas ordenadas por nombre
    List<Talla> getTallasOrdenadas();

    // Obtener talla por ID
    Optional<Talla> getTallaById(Long id);

    // Buscar tallas por nombre (búsqueda parcial)
    List<Talla> buscarTallas(String nombre);

    // Verificar si existe una talla por nombre
    boolean existeTalla(String nombreTalla);

    // Crear nueva talla
    Talla createTalla(Talla talla);

    // Actualizar talla
    Talla updateTalla(Long id, Talla talla);

    // Eliminar talla
    void deleteTalla(Long id);
} 