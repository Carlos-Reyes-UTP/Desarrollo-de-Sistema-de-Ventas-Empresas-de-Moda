package com.tienda.ropa.repository;

import com.tienda.ropa.entity.RUC;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RUCRepository extends JpaRepository<RUC, Long> {
    Optional<RUC> findByNumeroRuc(String numeroRuc);
}

