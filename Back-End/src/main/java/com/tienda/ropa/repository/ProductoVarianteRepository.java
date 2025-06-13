package com.tienda.ropa.repository;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Talla;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoVarianteRepository extends JpaRepository<ProductoVariante, Long> {
    List<ProductoVariante> findByProducto(Producto producto);

    List<ProductoVariante> findByProductoAndTalla(Producto producto, Talla talla);

    List<ProductoVariante> findByProductoAndColor(Producto producto, Color color);

    Optional<ProductoVariante> findByProductoAndTallaAndColor(Producto producto, Talla talla, Color color);

    Optional<ProductoVariante> findByCodigoBarrasVariante(String codigoBarras);

    @Query("SELECT SUM(pv.cantidad) FROM ProductoVariante pv WHERE pv.producto.idProducto = :idProducto")
    Integer getTotalCantidadByProducto(Long idProducto);
}
