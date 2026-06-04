package com.tienda.ropa.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.dto.AlertaReposicionDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AlertaReposicionService {

    public static final int UMBRAL_ALERTA = 4;

    private final InventarioRepository inventarioRepository;
    private final InventarioService inventarioService;
    private final InventarioContextService inventarioContextService;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final SolicitudService solicitudService;
    private final NotificationService notificationService;

    static String clavePendiente(Long idVariante, Long idUbicacionAreaDestino) {
        return idVariante + "-" + idUbicacionAreaDestino;
    }

    @Transactional(readOnly = true)
    public List<AlertaReposicionDTO> obtenerAlertas(Usuario usuario, String sectorOpcional) {
        Long idAreaFiltro = inventarioContextService.resolverIdAreaCatalogoFiltro(usuario, sectorOpcional);
        List<String> nombresAlmacen = InventarioService.nombresAlmacenLower();

        List<Inventario> filas;
        if (idAreaFiltro != null) {
            filas = inventarioRepository.findParaReposicionPorLineaCatalogo(
                    UMBRAL_ALERTA, nombresAlmacen, idAreaFiltro);
        } else {
            filas = inventarioRepository.findParaReposicion(UMBRAL_ALERTA, nombresAlmacen);
        }

        Set<String> pendientes = cargarParesReposicionPendiente();
        return mapearAlertas(filas, pendientes);
    }

    private List<AlertaReposicionDTO> mapearAlertas(List<Inventario> filas, Set<String> pendientes) {
        List<AlertaReposicionDTO> alertas = new ArrayList<>();

        for (Inventario fila : filas) {
            ProductoVariante variante = fila.getVariante();
            Producto producto = variante.getProducto();
            UbicacionArea ua = fila.getUbicacionArea();

            if (ua == null || ua.getUbicacion() == null || ua.getArea() == null) {
                continue;
            }

            int stockActual = fila.getStock() != null ? fila.getStock() : 0;
            int stockObjetivo = ReposicionAutomaticaService.resolverStockObjetivoPiso(fila);
            int cantidadSugerida = ReposicionAutomaticaService.calcularCantidadReposicion(fila);
            Long idUbicacionArea = ua.getIdUbicacionArea();
            boolean tienePendiente = pendientes.contains(
                    clavePendiente(variante.getIdProductoVariante(), idUbicacionArea));

            String sku = (variante.getSku() != null && !variante.getSku().isBlank())
                    ? variante.getSku()
                    : producto.getCodigoIdentificacion();

            alertas.add(new AlertaReposicionDTO(
                    variante.getIdProductoVariante(),
                    producto.getIdProducto(),
                    producto.getNombre(),
                    variante.getColor(),
                    variante.getTalla(),
                    sku,
                    ua.getUbicacion().getNombre(),
                    ua.getArea().getNombre(),
                    stockActual,
                    stockObjetivo,
                    cantidadSugerida,
                    tienePendiente,
                    idUbicacionArea));
        }

        return alertas;
    }

    private Set<String> cargarParesReposicionPendiente() {
        Set<String> pendientes = new HashSet<>();
        for (Object[] par : detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente()) {
            Long idVariante = (Long) par[0];
            Long idDestino = (Long) par[1];
            if (idVariante != null && idDestino != null) {
                pendientes.add(clavePendiente(idVariante, idDestino));
            }
        }
        return pendientes;
    }

    @Transactional
    public Solicitud reponer(Long idVariante, Long idUbicacionAreaDestino, Long idUsuario) {
        return reponer(idVariante, idUbicacionAreaDestino, idUsuario, null);
    }

    @Transactional
    public Solicitud reponer(
            Long idVariante,
            Long idUbicacionAreaDestino,
            Long idUsuario,
            Integer cantidadSolicitada) {
        if (idUsuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado.");
        }

        UbicacionArea destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(idUbicacionAreaDestino)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ubicación-área destino no encontrada: " + idUbicacionAreaDestino));

        if (inventarioService.esUbicacionAlmacen(destino)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se puede reponer un área de almacén.");
        }

        int stockActual = inventarioService.stockEnUbicacionArea(idVariante, idUbicacionAreaDestino);
        if (stockActual > UMBRAL_ALERTA) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El stock actual (" + stockActual + ") supera el umbral de alerta (" + UMBRAL_ALERTA + ").");
        }

        if (detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        idVariante,
                        TipoSolicitud.REPOSICION,
                        EstadoSolicitud.PENDIENTE,
                        idUbicacionAreaDestino)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe una solicitud de reposición pendiente para esta variante en el destino indicado.");
        }

        int cantidad = cantidadSolicitada != null
                ? cantidadSolicitada
                : inventarioRepository
                        .findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                                idVariante, idUbicacionAreaDestino)
                        .map(ReposicionAutomaticaService::calcularCantidadReposicion)
                        .orElseGet(() -> Math.max(
                                1,
                                ReposicionAutomaticaService.STOCK_OBJETIVO_PISO_DEFECTO - stockActual));
        if (cantidad < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La cantidad debe ser al menos 1.");
        }

        int stockDisponibleAlmacen = inventarioService.stockEnAlmacenDeLinea(idVariante, destino);
        if (cantidad > stockDisponibleAlmacen) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Stock insuficiente en almacén: disponible "
                            + stockDisponibleAlmacen + ", solicitado " + cantidad + ".");
        }

        UbicacionArea origen;
        try {
            origen = inventarioService.resolverOrigenAlmacenConStock(idVariante, cantidad, destino);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se pudo resolver origen en almacén: " + e.getMessage());
        }

        CrearSolicitudDTO dto = new CrearSolicitudDTO(
                TipoSolicitud.REPOSICION.toString(),
                origen.getIdUbicacionArea(),
                destino.getIdUbicacionArea(),
                List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad)),
                null);

        Solicitud solicitud = solicitudService.crear(dto, idUsuario);

        notificationService.sendNotificationObject(Map.of(
                "type", "REPOSICION_AUTOMATICA",
                "idVariante", idVariante,
                "idUbicacionAreaDestino", idUbicacionAreaDestino,
                "cantidad", cantidad));

        return solicitud;
    }
}
