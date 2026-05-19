package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UbicacionAreaRepository extends JpaRepository<UbicacionArea, Long> {

    Optional<UbicacionArea> findByUbicacionAndArea_NombreIgnoreCase(Ubicacion ubicacion, String nombreArea);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(:nombreUbicacion)) "
            + "AND LOWER(TRIM(a.nombre)) = LOWER(TRIM(:nombreArea))")
    Optional<UbicacionArea> findByUbicacionNombreAndAreaNombre(
            @Param("nombreUbicacion") String nombreUbicacion,
            @Param("nombreArea") String nombreArea);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(:nombrePiso)) "
            + "ORDER BY a.nombre, ua.idUbicacionArea")
    List<UbicacionArea> findByPisoNombre(@Param("nombrePiso") String nombrePiso);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE ua.idUbicacionArea <> :idDestino "
            + "AND LOWER(TRIM(u.nombre)) NOT IN :reservadasLower "
            + "ORDER BY u.nombre, a.nombre")
    List<UbicacionArea> findOrigenesPosibles(
            @Param("idDestino") Long idDestino,
            @Param("reservadasLower") List<String> reservadasLower);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE LOWER(TRIM(u.nombre)) IN :nombresAlmacenLower "
            + "ORDER BY a.nombre, ua.idUbicacionArea")
    List<UbicacionArea> findAreasAlmacen(@Param("nombresAlmacenLower") List<String> nombresAlmacenLower);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE ua.idUbicacionArea = :id")
    Optional<UbicacionArea> findByIdWithUbicacionYArea(@Param("id") Long id);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "WHERE a.idArea = :idAreaCatalogo "
            + "ORDER BY u.nombre, a.nombre, ua.idUbicacionArea")
    List<UbicacionArea> findByCatalogoAreaId(@Param("idAreaCatalogo") Long idAreaCatalogo);

    @Query("SELECT ua FROM UbicacionArea ua "
            + "JOIN FETCH ua.ubicacion u JOIN FETCH ua.area a "
            + "ORDER BY u.nombre, a.nombre, ua.idUbicacionArea")
    List<UbicacionArea> findAllWithUbicacionYArea();
}
