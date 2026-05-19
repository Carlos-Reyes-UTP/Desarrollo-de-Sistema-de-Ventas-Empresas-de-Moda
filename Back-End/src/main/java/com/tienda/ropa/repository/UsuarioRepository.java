package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuarioAndPassword(String usuario,String clave);

    Optional<Usuario> findByUsuario(String usuario);

    @Query("SELECT u FROM Usuario u "
            + "LEFT JOIN FETCH u.areaAsignado aa "
            + "LEFT JOIN FETCH aa.ubicacion "
            + "LEFT JOIN FETCH aa.area "
            + "WHERE u.usuario = :usuario")
    Optional<Usuario> findByUsuarioWithAreaAsignada(@Param("usuario") String usuario);

    @Query("SELECT u FROM Usuario u "
            + "LEFT JOIN FETCH u.areaAsignado aa "
            + "LEFT JOIN FETCH aa.ubicacion "
            + "LEFT JOIN FETCH aa.area "
            + "WHERE u.id = :id")
    Optional<Usuario> findByIdWithAreaAsignada(@Param("id") Long id);
}
