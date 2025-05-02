package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Distribuidor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DistribuidorRepository extends JpaRepository<Distribuidor, Long> {
    Optional<Distribuidor> findByNombre(String nombre);
}
