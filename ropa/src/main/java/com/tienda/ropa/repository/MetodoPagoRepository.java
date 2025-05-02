package com.tienda.ropa.repository;

import com.tienda.ropa.entity.MetodoPago;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MetodoPagoRepository extends JpaRepository<MetodoPago, Long> {
}