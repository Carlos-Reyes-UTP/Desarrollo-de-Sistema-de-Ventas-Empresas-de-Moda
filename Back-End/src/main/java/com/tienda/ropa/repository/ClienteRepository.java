package com.tienda.ropa.repository;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tienda.ropa.entity.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByNumeroDocumento(String numeroDocumento);
}
