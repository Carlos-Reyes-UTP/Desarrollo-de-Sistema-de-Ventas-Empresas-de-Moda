package com.tienda.ropa.repository;

import com.tienda.ropa.dto.AreaStockResumenDTO;
import com.tienda.ropa.entity.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UbicacionRepository extends JpaRepository<Ubicacion, Long> {

    Optional<Ubicacion> findByNombreIgnoreCase(String nombre);

    @Query("SELECT DISTINCT u.nombre FROM Ubicacion u "
            + "WHERE LOWER(TRIM(u.nombre)) NOT IN :reservadasLower "
            + "ORDER BY u.nombre")
    List<String> findPisosDistintos(@Param("reservadasLower") List<String> reservadasLower);

    @Query("SELECT NEW com.tienda.ropa.dto.AreaStockResumenDTO("
            + "ua.idUbicacionArea, u.nombre, a.nombre, null, "
            + "COALESCE(SUM(i.stock), 0L), COUNT(i.idInventario)) "
            + "FROM UbicacionArea ua "
            + "JOIN ua.ubicacion u JOIN ua.area a "
            + "LEFT JOIN Inventario i ON i.ubicacionArea.idUbicacionArea = ua.idUbicacionArea AND i.stock > 0 "
            + "WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(:nombrePiso)) "
            + "GROUP BY ua.idUbicacionArea, u.nombre, a.nombre "
            + "ORDER BY a.nombre, ua.idUbicacionArea")
    List<AreaStockResumenDTO> resumenStockPorPiso(@Param("nombrePiso") String nombrePiso);
}
