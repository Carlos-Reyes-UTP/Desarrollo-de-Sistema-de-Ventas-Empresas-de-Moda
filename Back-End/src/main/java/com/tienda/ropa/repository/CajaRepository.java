package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Caja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CajaRepository extends JpaRepository<Caja, Long> {

    Optional<Caja> findByUsuarioIdAndEstado(Long idUsuario, String estado);

    Optional<Caja> findByUsuarioIdAndEstadoAndFechaAperturaBetween(
            Long idUsuario, String estado, java.time.LocalDateTime fechaInicio, java.time.LocalDateTime fechaFin);

    List<Caja> findByUsuarioIdOrderByFechaAperturaDesc(Long idUsuario);

    List<Caja> findByEstadoOrderByFechaAperturaDesc(String estado);

    List<Caja> findByFechaAperturaBetweenOrderByFechaAperturaDesc(
            java.time.LocalDateTime fechaInicio, java.time.LocalDateTime fechaFin);

    Optional<Caja> findByNumeroOperacion(String numeroOperacion);
}