package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByCategoria(Categoria categoria);
    List<Producto> findByProveedor(Proveedores distribuidor);
    List<Producto> findByCodigoIdentificacion(String codigo);
    List<Producto> findByNombre(String nombre);
    Optional<Producto> findByCodigoBarras(String codigoBarras);
    boolean existsByCodigoBarras(String codigoBarras);
}
