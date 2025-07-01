package com.tienda.ropa.service;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Talla;

import java.util.List;
import java.util.Optional;

public interface ProductoVarianteService {

    /**
     * Crear una nueva variante de producto
     * @param productoVariante La variante a crear
     * @return La variante creada
     */
    ProductoVariante crearVariante(ProductoVariante productoVariante);

    /**
     * Actualizar una variante existente
     * @param idVariante ID de la variante a actualizar
     * @param productoVariante Datos actualizados
     * @return La variante actualizada
     */
    ProductoVariante actualizarVariante(Long idVariante, ProductoVariante productoVariante);

    /**
     * Obtener una variante por su ID
     * @param idVariante ID de la variante
     * @return La variante encontrada o vacío si no existe
     */
    Optional<ProductoVariante> obtenerVariantePorId(Long idVariante);

    /**
     * Obtener todas las variantes de productos disponibles
     * @return Lista de todas las variantes
     */
    List<ProductoVariante> obtenerTodasLasVariantes();

    /**
     * Obtener todas las variantes con información completa del producto para el cajero
     * @return Lista de todas las variantes con información del producto
     */
    List<Object[]> obtenerTodasLasVariantesParaCajero();

    /**
     * Obtener todas las variantes de un producto
     * @param idProducto ID del producto
     * @return Lista de variantes
     */
    List<ProductoVariante> obtenerVariantesPorProducto(Long idProducto);

    /**
     * Obtener variantes por producto y talla
     * @param idProducto ID del producto
     * @param idTalla ID de la talla
     * @return Lista de variantes
     */
    List<ProductoVariante> obtenerVariantesPorProductoYTalla(Long idProducto, Long idTalla);

    /**
     * Obtener variantes por producto y color
     * @param idProducto ID del producto
     * @param idColor ID del color
     * @return Lista de variantes
     */
    List<ProductoVariante> obtenerVariantesPorProductoYColor(Long idProducto, Long idColor);

    /**
     * Obtener una variante específica por producto, talla y color
     * @param idProducto ID del producto
     * @param idTalla ID de la talla
     * @param idColor ID del color
     * @return La variante encontrada o vacío si no existe
     */
    Optional<ProductoVariante> obtenerVariantePorProductoTallaColor(Long idProducto, Long idTalla, Long idColor);

    /**
     * Actualizar la cantidad de una variante
     * @param idVariante ID de la variante
     * @param nuevaCantidad Nueva cantidad
     * @return La variante actualizada
     */
    ProductoVariante actualizarCantidad(Long idVariante, Integer nuevaCantidad);

    /**
     * Eliminar una variante
     * @param idVariante ID de la variante a eliminar
     */
    void eliminarVariante(Long idVariante);

    /**
     * Obtener la cantidad total de un producto sumando todas sus variantes
     * @param idProducto ID del producto
     * @return Cantidad total
     */
    Integer obtenerCantidadTotalProducto(Long idProducto);

    /**
     * Migrar un producto existente a un sistema de variantes
     * @param idProducto ID del producto
     * @param tallas Lista de tallas disponibles
     * @param colores Lista de colores disponibles
     * @param distribucionPorcentual Si se debe distribuir el stock proporcionalmente
     * @return Lista de variantes creadas
     */
    List<ProductoVariante> migrarProductoAVariantes(Long idProducto, List<Talla> tallas, List<Color> colores, boolean distribucionPorcentual);
}
