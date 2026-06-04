package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReposicionAutomaticaService {

    public static final String USUARIO_SISTEMA = "SISTEMA";
    /** Objetivo de stock en piso cuando la fila no define {@code stock_maximo}. */
    public static final int STOCK_OBJETIVO_PISO_DEFECTO = 15;

    private final InventarioRepository inventarioRepository;
    private final InventarioService inventarioService;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final SolicitudService solicitudService;

    @Transactional
    public void evaluarTrasSalidaEnUbicacionArea(Long idVariante, Long idUbicacionAreaDestino) {
        Optional<Inventario> filaOpt = inventarioRepository
                .findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                        idVariante, idUbicacionAreaDestino);
        if (filaOpt.isEmpty()) {
            return;
        }
        Inventario fila = filaOpt.get();
        UbicacionArea destino = fila.getUbicacionArea();
        if (destino != null && destino.getIdUbicacionArea() != null) {
            destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(destino.getIdUbicacionArea())
                    .orElse(destino);
        }
        if (destino == null || inventarioService.esUbicacionAlmacen(destino)) {
            return;
        }

        int actual = fila.getStock() != null ? fila.getStock() : 0;
        int min = fila.getStockMinimo() != null ? fila.getStockMinimo() : 0;
        if (actual > min) {
            return;
        }

        Long idDestino = destino.getIdUbicacionArea();
        if (idDestino != null && detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        idVariante, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, idDestino)) {
            return;
        }

        int cantidad = calcularCantidadReposicion(fila);
        UbicacionArea origen;
        try {
            origen = inventarioService.resolverOrigenAlmacenConStock(idVariante, cantidad, destino);
        } catch (Exception e) {
            return;
        }
        if (origen.getIdUbicacionArea().equals(destino.getIdUbicacionArea())) {
            return;
        }

        Usuario sistema = usuarioRepository.findByUsuario(USUARIO_SISTEMA).orElse(null);
        if (sistema == null) {
            return;
        }

        CrearSolicitudDTO dto = new CrearSolicitudDTO(
                TipoSolicitud.REPOSICION.toString(),
                origen.getIdUbicacionArea(),
                destino.getIdUbicacionArea(),
                List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad)),
                null);
        solicitudService.crear(dto, sistema.getId());
    }

    @Transactional
    public void evaluarTrasVentaDirectaDesdeAlmacen(Long idVariante, Long idUbicacionAreaAlmacen) {
        List<Inventario> filas = inventarioRepository.findByVariante_IdProductoVariante(idVariante);
        if (filas == null || filas.isEmpty()) {
            return;
        }

        for (Inventario fila : filas) {
            UbicacionArea ua = fila.getUbicacionArea();
            if (ua == null || ua.getIdUbicacionArea() == null) {
                continue;
            }
            if (ua.getIdUbicacionArea().equals(idUbicacionAreaAlmacen)) {
                continue;
            }
            if (inventarioService.esUbicacionAlmacen(ua)) {
                continue;
            }

            UbicacionArea destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(ua.getIdUbicacionArea())
                    .orElse(ua);
            int stockPiso = fila.getStock() != null ? fila.getStock() : 0;
            int min = fila.getStockMinimo() != null ? fila.getStockMinimo() : 0;
            if (stockPiso > min) {
                continue;
            }

            Long idDestinoPiso = destino.getIdUbicacionArea();
            if (idDestinoPiso != null && detalleSolicitudRepository
                    .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                            idVariante, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, idDestinoPiso)) {
                continue;
            }

            int cantidad = calcularCantidadReposicion(fila);
            int stockDisponibleAlmacen = inventarioService.stockEnUbicacionArea(idVariante, idUbicacionAreaAlmacen);
            if (stockDisponibleAlmacen < cantidad) {
                if (stockDisponibleAlmacen <= 0) {
                    return;
                }
                cantidad = stockDisponibleAlmacen;
            }

            UbicacionArea origen = ubicacionAreaRepository.findById(idUbicacionAreaAlmacen).orElse(null);
            if (origen == null || origen.getIdUbicacionArea().equals(destino.getIdUbicacionArea())) {
                return;
            }

            Usuario sistema = usuarioRepository.findByUsuario(USUARIO_SISTEMA)
                    .orElseThrow(() -> new IllegalStateException(
                            "Usuario '" + USUARIO_SISTEMA + "' no existe."));

            CrearSolicitudDTO dto = new CrearSolicitudDTO(
                    TipoSolicitud.REPOSICION.toString(),
                    origen.getIdUbicacionArea(),
                    destino.getIdUbicacionArea(),
                    List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad)),
                    null);
            solicitudService.crear(dto, sistema.getId());
            return;
        }
    }

    public static int resolverStockObjetivoPiso(Inventario fila) {
        Integer max = fila.getStockMaximo();
        if (max != null && max > 0) {
            return max;
        }
        return STOCK_OBJETIVO_PISO_DEFECTO;
    }

    public static int calcularCantidadReposicion(Inventario fila) {
        int actual = fila.getStock() != null ? fila.getStock() : 0;
        int objetivo = resolverStockObjetivoPiso(fila);
        return Math.max(1, objetivo - actual);
    }
}
