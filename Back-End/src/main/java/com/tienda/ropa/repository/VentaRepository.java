package com.tienda.ropa.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tienda.ropa.entity.Venta;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    // Método actualizado para buscar por rango de fechas de un día completo
    @Query("SELECT v FROM Venta v WHERE DATE(v.fechaVenta) = :fecha")
    List<Venta> findByFechaVenta(@Param("fecha") LocalDate fechaVenta);
    
    // Método para buscar por rango específico de fecha y hora
    List<Venta> findByFechaVentaBetween(LocalDateTime fechaInicio, LocalDateTime fechaFin);
    
    List<Venta> findByClienteIdCliente(Long idCliente);
}
