package com.tienda.ropa.service;

import com.tienda.ropa.dto.ItemTrasladoDTO;
import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.dto.TrasladoMasivoDTO;
import com.tienda.ropa.entity.MovimientoInventario;
import com.tienda.ropa.entity.ProductoVariante;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrasladoInventarioService {

    private final InventarioService inventarioService;
    private final InventarioContextService inventarioContextService;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final ProductoVarianteRepository productoVarianteRepository;
    private final MovimientoInventarioRepository movimientoInventarioRepository;
    private final NotificationService notificationService;

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

        validarUbicacionesActivas(origen, destino);

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

        UUID grupoMovimiento = UUID.randomUUID();
        LocalDateTime ahora = LocalDateTime.now();

        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setVariante(variante);
        movimiento.setUbicacionAreaOrigen(origen);
        movimiento.setUbicacionAreaDestino(destino);
        movimiento.setCantidad(dto.cantidad());
        movimiento.setTipoMovimiento(TipoMovimientoInventario.TRASLADO);
        movimiento.setFechaCreacion(ahora);
        movimiento.setUsuario(usuario);
        movimiento.setGrupoMovimiento(grupoMovimiento);
        movimientoInventarioRepository.save(movimiento);

        notificationService.sendNotificationObject(Map.of(
                "type", "INVENTARIO_TRASLADO",
                "idVariante", dto.idVariante(),
                "idUbicacionAreaOrigen", dto.idUbicacionAreaOrigen(),
                "idUbicacionAreaDestino", dto.idUbicacionAreaDestino(),
                "cantidad", dto.cantidad()));
    }

    private static void validarUbicacionesActivas(UbicacionArea origen, UbicacionArea destino) {
        if (!origen.isActivo()
                || origen.getUbicacion() == null
                || !origen.getUbicacion().isActivo()
                || origen.getArea() == null
                || !origen.getArea().isActivo()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La ubicación de origen no está activa.");
        }
        if (!destino.isActivo()
                || destino.getUbicacion() == null
                || !destino.getUbicacion().isActivo()
                || destino.getArea() == null
                || !destino.getArea().isActivo()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La ubicación de destino no está activa.");
        }
    }

    @Transactional
    public void moverMasivo(TrasladoMasivoDTO dto, Usuario usuario) {
        if (dto == null || dto.items() == null || dto.items().isEmpty()) {
            throw new IllegalArgumentException("Debe indicar al menos un producto para trasladar");
        }
        if (dto.idUbicacionAreaOrigen() == null || dto.idUbicacionAreaDestino() == null) {
            throw new IllegalArgumentException("Origen y destino son obligatorios");
        }
        if (dto.idUbicacionAreaOrigen().equals(dto.idUbicacionAreaDestino())) {
            throw new IllegalArgumentException("La ubicación de origen y destino no pueden coincidir");
        }

        UbicacionArea origen = ubicacionAreaRepository.findByIdWithUbicacionYArea(dto.idUbicacionAreaOrigen())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ubicación-área origen no encontrada: " + dto.idUbicacionAreaOrigen()));
        UbicacionArea destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(dto.idUbicacionAreaDestino())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ubicación-área destino no encontrada: " + dto.idUbicacionAreaDestino()));

        validarUbicacionesActivas(origen, destino);

        for (ItemTrasladoDTO item : dto.items()) {
            if (item.idVariante() == null || item.cantidad() == null || item.cantidad() <= 0) {
                throw new IllegalArgumentException("Cada item debe tener idVariante y cantidad mayor a cero");
            }
        }

        UUID grupoMovimiento = UUID.randomUUID();
        LocalDateTime ahora = LocalDateTime.now();

        List<ProductoVariante> variantes = new ArrayList<>();
        for (ItemTrasladoDTO item : dto.items()) {
            ProductoVariante variante = productoVarianteRepository.findById(item.idVariante())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Variante no encontrada: " + item.idVariante()));
            variantes.add(variante);

            if (usuario != null && inventarioContextService.esAlmaceneroDeLinea(usuario)) {
                validarTrasladoAlmacenero(usuario, origen, destino, item.idVariante());
            }
        }

        for (int i = 0; i < dto.items().size(); i++) {
            ItemTrasladoDTO item = dto.items().get(i);
            ProductoVariante variante = variantes.get(i);

            String mensajeStock = "Stock insuficiente en '"
                    + InventarioService.etiquetaUbicacionArea(origen)
                    + "' para '" + variante.getColor() + " / " + variante.getTalla()
                    + "' (solicitado: " + item.cantidad() + ")";

            inventarioService.aplicarDeltaEnUbicacionArea(
                    variante.getIdProductoVariante(),
                    origen,
                    -item.cantidad(),
                    mensajeStock);
            inventarioService.aplicarDeltaEnUbicacionArea(
                    variante.getIdProductoVariante(),
                    destino,
                    item.cantidad(),
                    "No se pudo aumentar stock en destino");

            MovimientoInventario movimiento = new MovimientoInventario();
            movimiento.setVariante(variante);
            movimiento.setUbicacionAreaOrigen(origen);
            movimiento.setUbicacionAreaDestino(destino);
            movimiento.setCantidad(item.cantidad());
            movimiento.setTipoMovimiento(TipoMovimientoInventario.TRASLADO);
            movimiento.setFechaCreacion(ahora);
            movimiento.setUsuario(usuario);
            movimiento.setGrupoMovimiento(grupoMovimiento);
            movimientoInventarioRepository.save(movimiento);
        }

        notificationService.sendNotificationObject(Map.of(
                "type", "INVENTARIO_TRASLADO_MASIVO",
                "cantidadItems", dto.items().size(),
                "idUbicacionAreaOrigen", dto.idUbicacionAreaOrigen(),
                "idUbicacionAreaDestino", dto.idUbicacionAreaDestino()));
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
