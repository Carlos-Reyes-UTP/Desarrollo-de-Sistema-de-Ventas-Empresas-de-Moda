// ProveedoresRepository.java - asegurar coherencia
package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Proveedores;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProveedoresRepository extends JpaRepository<Proveedores, Long> {
    Optional<Proveedores> findByNombre(String nombre);
    Optional<Proveedores> findByRuc(String ruc);
}