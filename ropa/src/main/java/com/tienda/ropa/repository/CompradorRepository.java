package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Comprador;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompradorRepository extends JpaRepository<Comprador, Long> {
}
