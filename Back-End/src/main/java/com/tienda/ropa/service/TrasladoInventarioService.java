package com.tienda.ropa.service;

import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aplica un traslado inmediato de stock entre dos filas {@code inventario_ubicacion}
 * dentro de una única transacción: resta del origen, suma al destino y
 * sincroniza {@code producto_variante.cantidad}.
 */
@Service
@RequiredArgsConstructor
public class TrasladoInventarioService {

    private final InventarioUbicacionService inventarioUbicacionService;
    private final UbicacionRepository ubicacionRepository;
    private final ProductoVarianteRepository productoVarianteRepository;

    @Transactional
    public void mover(TrasladoInventarioDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Datos de traslado requeridos");
        }
        if (dto.idVariante() == null || dto.idUbicacionOrigen() == null
                || dto.idUbicacionDestino() == null || dto.cantidad() == null) {
            throw new IllegalArgumentException("Variante, origen, destino y cantidad son obligatorios");
        }
        if (dto.cantidad() <= 0) {
            throw new IllegalArgumentException("La cantidad a mover debe ser mayor a cero");
        }
        if (dto.idUbicacionOrigen().equals(dto.idUbicacionDestino())) {
            throw new IllegalArgumentException("La ubicación de origen y destino no pueden coincidir");
        }

        ProductoVariante variante = productoVarianteRepository.findById(dto.idVariante())
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada: " + dto.idVariante()));
        Ubicacion origen = ubicacionRepository.findById(dto.idUbicacionOrigen())
                .orElseThrow(() -> new IllegalArgumentException("Ubicación origen no encontrada: " + dto.idUbicacionOrigen()));
        Ubicacion destino = ubicacionRepository.findById(dto.idUbicacionDestino())
                .orElseThrow(() -> new IllegalArgumentException("Ubicación destino no encontrada: " + dto.idUbicacionDestino()));

        inventarioUbicacionService.aplicarDeltaEnUbicacion(
                variante.getIdProductoVariante(),
                origen,
                -dto.cantidad(),
                "Stock insuficiente en '" + origen.getNombre()
                        + (origen.getArea() != null ? " / " + origen.getArea() : "") + "'");
        inventarioUbicacionService.aplicarDeltaEnUbicacion(
                variante.getIdProductoVariante(),
                destino,
                dto.cantidad(),
                "No se pudo aumentar stock en destino");
    }
}
