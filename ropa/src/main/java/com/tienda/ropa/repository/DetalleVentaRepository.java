package com.tienda.ropa.repository;

import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DetalleVentaRepository extends JpaRepository<DetalleVenta, Long> {
    List<DetalleVenta> findByVenta(Venta venta);
}
