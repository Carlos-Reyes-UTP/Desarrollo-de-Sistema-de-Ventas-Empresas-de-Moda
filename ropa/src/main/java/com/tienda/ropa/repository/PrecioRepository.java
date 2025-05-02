package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Precio;
import com.tienda.ropa.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrecioRepository extends JpaRepository<Precio, Long> {
    List<Precio> findByProducto(Producto producto);
}

