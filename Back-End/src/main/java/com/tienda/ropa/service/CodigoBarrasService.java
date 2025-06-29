package com.tienda.ropa.service;

import com.tienda.ropa.dto.CodigoBarrasDTO;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;

import java.awt.image.BufferedImage;
import java.io.IOException;

public interface CodigoBarrasService {
    /**
     * Genera un código de barras para un producto basado en su ID
     * @param idProducto ID del producto
     * @param ancho Ancho de la imagen en píxeles
     * @param alto Alto de la imagen en píxeles
     * @return La imagen del código de barras generado
     */
    BufferedImage generarCodigoBarras(Long idProducto, Integer ancho, Integer alto) throws Exception;

    /**
     * Genera un código de barras para una variante específica de un producto
     * @param idVariante ID de la variante del producto
     * @param ancho Ancho de la imagen en píxeles
     * @param alto Alto de la imagen en píxeles
     * @return La imagen del código de barras generado
     */
    BufferedImage generarCodigoBarrasVariante(Long idVariante, Integer ancho, Integer alto) throws Exception;

    /**
     * Genera un código de barras para un producto y lo retorna como array de bytes
     * @param idProducto ID del producto
     * @return Array de bytes de la imagen PNG del código de barras
     */
    byte[] generarCodigoBarrasProducto(Long idProducto) throws Exception;

    /**
     * Genera un código de barras para una variante y lo retorna como array de bytes
     * @param idVariante ID de la variante del producto
     * @return Array de bytes de la imagen PNG del código de barras
     */
    byte[] generarCodigoBarrasVariante(Long idVariante) throws Exception;

    /**
     * Asigna un código de barras personalizado a un producto
     * @param idProducto ID del producto
     * @param codigoBarrasDTO DTO con el código a asignar y dimensiones de la imagen
     * @return El producto actualizado
     */
    Producto asignarCodigoBarras(Long idProducto, CodigoBarrasDTO codigoBarrasDTO) throws Exception;

    /**
     * Asigna un código de barras personalizado a una variante de producto
     * @param idVariante ID de la variante del producto
     * @param codigoBarrasDTO DTO con el código a asignar y dimensiones de la imagen
     * @return La variante de producto actualizada
     */
    ProductoVariante asignarCodigoBarrasVariante(Long idVariante, CodigoBarrasDTO codigoBarrasDTO) throws Exception;

    /**
     * Lee un código de barras a partir de una imagen
     * @param imagenBytes Array de bytes de la imagen que contiene el código de barras
     * @return El código decodificado
     */
    String leerCodigoBarras(byte[] imagenBytes) throws IOException, Exception;

    /**
     * Busca un producto por su código de barras
     * @param codigo Código de barras a buscar
     * @return El producto encontrado o null si no existe
     */
    Producto buscarPorCodigoBarras(String codigo) throws Exception;

    /**
     * Busca una variante de producto por su código de barras
     * @param codigo Código de barras a buscar
     * @return La variante de producto encontrada o null si no existe
     */
    ProductoVariante buscarVariantePorCodigoBarras(String codigo) throws Exception;

    /**
     * Calcula el dígito verificador para un código EAN-8
     * @param codigo Los primeros 7 dígitos del código
     * @return El dígito verificador
     */
    int calcularDigitoVerificador(String codigo);

    /**
     * Verifica si un código de barras EAN-8 es válido
     * @param codigo Código de barras completo (8 dígitos)
     * @return true si es válido, false en caso contrario
     */
    boolean validarCodigoBarras(String codigo);
}
