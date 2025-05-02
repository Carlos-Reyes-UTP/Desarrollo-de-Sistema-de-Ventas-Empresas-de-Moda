package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Rol;
import com.tienda.ropa.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface RolRepository extends JpaRepository<Rol,Long> {
    Optional<Rol> findByNombreRol(Role rol);
}
