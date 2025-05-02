package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findByFechaVenta(LocalDate fechaVenta);
    List<Venta> findByComprador_IdComprador(Long idComprador);
}
