package com.tienda.ropa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.entity.Mayorista;

public interface MayoristaRepository extends JpaRepository<Mayorista, Long> {
    
    Optional<Mayorista> findByCodigoMayorista(String codigoMayorista);
    
    Optional<Mayorista> findByCliente(Cliente cliente);
    
    @Query("SELECT m FROM Mayorista m WHERE m.cliente.numeroDocumento = :numeroDocumento")
    Optional<Mayorista> findByClienteNumeroDocumento(@Param("numeroDocumento") String numeroDocumento);
    
    boolean existsByCodigoMayorista(String codigoMayorista);
    
    boolean existsByCliente(Cliente cliente);
}
