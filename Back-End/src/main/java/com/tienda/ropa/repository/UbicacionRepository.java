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

    /**
     * Pisos disponibles para el módulo almacenero: nombres distintos excluyendo
     * las ubicaciones reservadas (Almacén y variantes ortográficas).
     * El backend pasa la lista en minúsculas para comparar con LOWER(nombre).
     */
    @Query("SELECT DISTINCT u.nombre FROM Ubicacion u " +
            "WHERE LOWER(TRIM(u.nombre)) NOT IN :reservadasLower " +
            "ORDER BY u.nombre")
    List<String> findPisosDistintos(@Param("reservadasLower") List<String> reservadasLower);

    /**
     * Todas las filas (áreas) de un piso dado (match por nombre, case-insensitive).
     */
    @Query("SELECT u FROM Ubicacion u " +
            "WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(:nombrePiso)) " +
            "ORDER BY u.area NULLS LAST, u.idUbicacion")
    List<Ubicacion> findAreasDePiso(@Param("nombrePiso") String nombrePiso);

    /**
     * Por cada ubicación del piso: suma de stock y cantidad de variantes con stock &gt; 0.
     */
    @Query("SELECT NEW com.tienda.ropa.dto.AreaStockResumenDTO(" +
            "u.idUbicacion, u.nombre, u.area, u.descripcion, " +
            "COALESCE(SUM(i.stockActual), 0L), COUNT(i.idInventarioUbicacion)) " +
            "FROM Ubicacion u LEFT JOIN InventarioUbicacion i ON i.ubicacion.idUbicacion = u.idUbicacion " +
            "AND i.stockActual > 0 " +
            "WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(:nombrePiso)) " +
            "GROUP BY u.idUbicacion, u.nombre, u.area, u.descripcion " +
            "ORDER BY u.area NULLS LAST, u.idUbicacion")
    List<AreaStockResumenDTO> resumenStockPorPiso(@Param("nombrePiso") String nombrePiso);

    /**
     * Ubicaciones candidatas como origen de un traslado: todas excepto el destino.
     */
    @Query("SELECT u FROM Ubicacion u " +
            "WHERE u.idUbicacion <> :idDestino " +
            "AND LOWER(TRIM(u.nombre)) NOT IN :reservadasLower " +
            "ORDER BY u.nombre, u.area NULLS LAST")
    List<Ubicacion> findOrigenesPosibles(@Param("idDestino") Long idDestino,
                                         @Param("reservadasLower") List<String> reservadasLower);
}
