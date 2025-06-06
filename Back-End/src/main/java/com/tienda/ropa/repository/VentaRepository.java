package com.tienda.ropa.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tienda.ropa.entity.Venta;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findByFechaVenta(LocalDate fechaVenta);
    List<Venta> findByClienteIdCliente(Long idCliente);
}
