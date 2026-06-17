package com.tienda.ropa.repository;

import com.tienda.ropa.entity.MovimientoInventario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    @Query(value = "SELECT m.grupoMovimiento FROM MovimientoInventario m " +
           "WHERE m.fechaCreacion BETWEEN :inicio AND :fin " +
           "AND m.grupoMovimiento IS NOT NULL " +
           "AND (:idArea IS NULL OR m.ubicacionAreaOrigen.idUbicacionArea = :idArea OR m.ubicacionAreaDestino.idUbicacionArea = :idArea) " +
           "GROUP BY m.grupoMovimiento " +
           "ORDER BY MAX(m.fechaCreacion) DESC",
           countQuery = "SELECT COUNT(DISTINCT m.grupoMovimiento) FROM MovimientoInventario m " +
                        "WHERE m.fechaCreacion BETWEEN :inicio AND :fin " +
                        "AND m.grupoMovimiento IS NOT NULL " +
                        "AND (:idArea IS NULL OR m.ubicacionAreaOrigen.idUbicacionArea = :idArea OR m.ubicacionAreaDestino.idUbicacionArea = :idArea)")
    Page<UUID> findGruposByMes(@Param("inicio") LocalDateTime inicio,
                                @Param("fin") LocalDateTime fin,
                                @Param("idArea") Long idArea,
                                Pageable pageable);

    @Query("SELECT m FROM MovimientoInventario m " +
           "WHERE m.grupoMovimiento = :grupo ORDER BY m.fechaCreacion ASC")
    List<MovimientoInventario> findByGrupoMovimiento(@Param("grupo") UUID grupo);
}
