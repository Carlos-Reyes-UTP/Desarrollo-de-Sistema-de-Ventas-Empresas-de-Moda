package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuarioAndPassword(String usuario,String clave);

    Optional<Usuario> findByUsuario(String usuario);
}
