package com.tienda.ropa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tienda.ropa.entity.Talla;

@Repository
public interface TallaRepository extends JpaRepository<Talla, Long> {
    Optional<Talla> findByNombreTalla(String nombreTalla);
    
    List<Talla> findByNombreTallaContainingIgnoreCase(String nombreTalla);
    
    boolean existsByNombreTalla(String nombreTalla);
}