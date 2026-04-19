package com.tienda.ropa.repository;

import com.tienda.ropa.entity.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    List<MovimientoCaja> findByCaja_IdOrderByFechaMovimientoAsc(Long idCaja);

    List<MovimientoCaja> findByCaja_IdAndTipoMovimientoOrderByFechaMovimientoAsc(Long idCaja, String tipoMovimiento);
}