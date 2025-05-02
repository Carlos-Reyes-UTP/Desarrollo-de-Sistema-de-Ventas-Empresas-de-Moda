package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Distribuidor;
import com.tienda.ropa.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByCategoria(Categoria categoria);
    List<Producto> findByDistribuidor(Distribuidor distribuidor);
    List<Producto> findByCodigoIdentificacion(String codigo);
    List<Producto> findByNombre(String nombre);
}
