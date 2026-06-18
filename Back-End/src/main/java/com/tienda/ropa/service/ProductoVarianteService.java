package com.tienda.ropa.service;

import com.tienda.ropa.dto.VarianteExportarDTO;
import com.tienda.ropa.dto.VarianteSugerenciasDTO;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;

import java.util.List;
import java.util.Optional;

public interface ProductoVarianteService {

    ProductoVariante crearVariante(ProductoVariante productoVariante, UbicacionArea areaEntrada);

    ProductoVariante actualizarVariante(Long idVariante, ProductoVariante productoVariante);

    Optional<ProductoVariante> obtenerVariantePorId(Long idVariante);

    List<ProductoVariante> obtenerTodasLasVariantes();

    VarianteSugerenciasDTO obtenerSugerenciasCatalogo();

    List<Object[]> obtenerTodasLasVariantesParaCajero();

    org.springframework.data.domain.Page<Object[]> obtenerVariantesPaginadasParaCajero(
            String busqueda, org.springframework.data.domain.Pageable pageable);

    List<ProductoVariante> obtenerVariantesPorProducto(Long idProducto, Long idUbicacionArea);

    List<ProductoVariante> obtenerVariantesPorProductoYTallaNombre(Long idProducto, String nombreTalla);

    List<ProductoVariante> obtenerVariantesPorProductoYColorNombre(Long idProducto, String nombreColor);

    Optional<ProductoVariante> obtenerVariantePorProductoTallaColorNombre(Long idProducto, String talla, String color);

    ProductoVariante actualizarCantidad(Long idVariante, Integer nuevaCantidad, UbicacionArea areaStock);

    void eliminarVariante(Long idVariante);

    Integer obtenerCantidadTotalProducto(Long idProducto);

    List<VarianteExportarDTO> exportarListado(@org.springframework.lang.Nullable String area);

    List<ProductoVariante> migrarProductoAVariantes(
            Long idProducto,
            List<String> tallas,
            List<String> colores,
            boolean distribucionPorcentual,
            UbicacionArea areaEntrada);
}
