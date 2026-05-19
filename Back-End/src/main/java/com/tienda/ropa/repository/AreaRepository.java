package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AreaRepository extends JpaRepository<Area, Long> {

    Optional<Area> findByNombreIgnoreCase(String nombre);
}
