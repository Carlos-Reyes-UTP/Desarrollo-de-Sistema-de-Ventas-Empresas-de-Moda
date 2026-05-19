package com.tienda.ropa.service;

import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.entity.MovimientoInventario;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Role;
import com.tienda.ropa.entity.TipoMovimientoInventario;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.MovimientoInventarioRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TrasladoInventarioService {

    private final InventarioService inventarioService;
    private final InventarioContextService inventarioContextService;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final ProductoVarianteRepository productoVarianteRepository;
    private final MovimientoInventarioRepository movimientoInventarioRepository;

    @Transactional
    public void mover(TrasladoInventarioDTO dto, Usuario usuario) {
        if (dto == null) {
            throw new IllegalArgumentException("Datos de traslado requeridos");
        }
        if (dto.idVariante() == null || dto.idUbicacionAreaOrigen() == null
                || dto.idUbicacionAreaDestino() == null || dto.cantidad() == null) {
            throw new IllegalArgumentException("Variante, origen, destino y cantidad son obligatorios");
        }
        if (dto.cantidad() <= 0) {
            throw new IllegalArgumentException("La cantidad a mover debe ser mayor a cero");
        }
        if (dto.idUbicacionAreaOrigen().equals(dto.idUbicacionAreaDestino())) {
            throw new IllegalArgumentException("La ubicación de origen y destino no pueden coincidir");
        }

        ProductoVariante variante = productoVarianteRepository.findById(dto.idVariante())
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada: " + dto.idVariante()));
        UbicacionArea origen = ubicacionAreaRepository.findByIdWithUbicacionYArea(dto.idUbicacionAreaOrigen())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ubicación-área origen no encontrada: " + dto.idUbicacionAreaOrigen()));
        UbicacionArea destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(dto.idUbicacionAreaDestino())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ubicación-área destino no encontrada: " + dto.idUbicacionAreaDestino()));

        if (usuario != null && inventarioContextService.esAlmaceneroDeLinea(usuario)) {
            validarTrasladoAlmacenero(usuario, origen, destino, variante.getIdProductoVariante());
        }

        inventarioService.aplicarDeltaEnUbicacionArea(
                variante.getIdProductoVariante(),
                origen,
                -dto.cantidad(),
                "Stock insuficiente en '" + InventarioService.etiquetaUbicacionArea(origen) + "'");
        inventarioService.aplicarDeltaEnUbicacionArea(
                variante.getIdProductoVariante(),
                destino,
                dto.cantidad(),
                "No se pudo aumentar stock en destino");

        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setVariante(variante);
        movimiento.setUbicacionAreaOrigen(origen);
        movimiento.setUbicacionAreaDestino(destino);
        movimiento.setCantidad(dto.cantidad());
        movimiento.setTipoMovimiento(TipoMovimientoInventario.TRASLADO);
        movimientoInventarioRepository.save(movimiento);
    }

    private void validarTrasladoAlmacenero(
            Usuario usuario, UbicacionArea origen, UbicacionArea destino, Long idVariante) {
        UbicacionArea asignada = usuario.getAreaAsignado();
        if (asignada == null || asignada.getArea() == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El almacenero no tiene área asignada para realizar traslados.");
        }
        Long idAreaCatalogo = asignada.getArea().getIdArea();

        if (origen.getArea() == null || !idAreaCatalogo.equals(origen.getArea().getIdArea())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Solo puede trasladar stock desde ubicaciones de su línea ("
                            + asignada.getArea().getNombre() + ").");
        }

        if (destino.getArea() == null || !idAreaCatalogo.equals(destino.getArea().getIdArea())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Solo puede trasladar hacia ubicaciones de su línea ("
                            + asignada.getArea().getNombre() + ").");
        }

        int stockEnOrigen = inventarioService.stockEnUbicacionArea(idVariante, origen.getIdUbicacionArea());
        if (stockEnOrigen <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No hay stock de la variante en el origen indicado.");
        }
    }
}
