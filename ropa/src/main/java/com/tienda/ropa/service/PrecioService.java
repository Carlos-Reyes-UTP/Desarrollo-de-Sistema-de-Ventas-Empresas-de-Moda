package com.tienda.ropa.service;

import com.tienda.ropa.entity.Precio;
import com.tienda.ropa.repository.PrecioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PrecioService {

    @Autowired
    private PrecioRepository precioRepository;

    public Precio agregarPrecio(Precio precio) {
        return precioRepository.save(precio);
    }

    public Optional<Precio> obtenerPrecioPorId(Long id) {
        return precioRepository.findById(id);
    }

    public List<Precio> obtenerTodosLosPrecios() {
        return precioRepository.findAll();
    }

    public Precio editarPrecio(Long id, Precio precioActualizado) {
        return precioRepository.findById(id).map(precio -> {
            precio.setProducto(precioActualizado.getProducto());
            precio.setPrecioUnitario(precioActualizado.getPrecioUnitario());
            precio.setPrecioCuarto(precioActualizado.getPrecioCuarto());
            precio.setPrecioMediaDocena(precioActualizado.getPrecioMediaDocena());
            precio.setPrecioDocena(precioActualizado.getPrecioDocena());
            return precioRepository.save(precio);
        }).orElseThrow(() -> new IllegalArgumentException("Precio no encontrado con el ID: " + id));
    }

    public void eliminarPrecio(Long id) {
        if (precioRepository.existsById(id)) {
            precioRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Precio no encontrado con el ID: " + id);
        }
    }
}