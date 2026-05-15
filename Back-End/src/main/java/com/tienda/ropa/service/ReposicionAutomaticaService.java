package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.InventarioUbicacion;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioUbicacionRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import com.tienda.ropa.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tras una salida de stock en una ubicación de tienda (piso/área), evalúa mínimos
 * y genera solicitudes de reposición para el almacén (sin intervención del cajero).
 */
@Service
@RequiredArgsConstructor
public class ReposicionAutomaticaService {

    public static final String USUARIO_SISTEMA = "SISTEMA";

    private static final String[] NOMBRES_ALMACEN_CANDIDATOS = {
            "Almacén", "Almacen", "ALMACEN", "Bodega", "Depósito", "Deposito"
    };

    private final InventarioUbicacionRepository inventarioUbicacionRepository;
    private final UbicacionRepository ubicacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final SolicitudService solicitudService;

    /**
     * Tras una salida de stock en una ubicación de tienda (piso/área), evalúa mínimos
     * y genera solicitudes de reposición desde Almacén hacia esa misma ubicación.
     */
    @Transactional
    public void evaluarTrasSalidaEnUbicacion(Long idVariante, Long idUbicacionDestino) {
        Optional<InventarioUbicacion> filaOpt = inventarioUbicacionRepository
                .findByVariante_IdProductoVarianteAndUbicacion_IdUbicacion(idVariante, idUbicacionDestino);
        if (filaOpt.isEmpty()) {
            return;
        }
        InventarioUbicacion fila = filaOpt.get();
        Ubicacion destino = fila.getUbicacion();
        if (destino == null) {
            return;
        }
        int actual = fila.getStockActual() != null ? fila.getStockActual() : 0;
        int min = fila.getStockMinimo() != null ? fila.getStockMinimo() : 0;
        if (actual > min) {
            return;
        }
        if (detalleSolicitudRepository.existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_Estado(
                idVariante, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE)) {
            return;
        }
        Optional<Ubicacion> origenOpt = ubicacionOrigenReposicion(destino);
        if (origenOpt.isEmpty()) {
            return;
        }
        Ubicacion origen = origenOpt.get();
        int cantidad = calcularCantidadReposicion(fila);
        Usuario sistema = usuarioRepository.findByUsuario(USUARIO_SISTEMA)
                .orElseThrow(() -> new IllegalStateException(
                        "Usuario '" + USUARIO_SISTEMA + "' no existe; ejecute migración V7 o cree el usuario técnico."));

        CrearSolicitudDTO dto = new CrearSolicitudDTO(
                TipoSolicitud.REPOSICION.name(),
                origen.getIdUbicacion(),
                destino.getIdUbicacion(),
                List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad))
        );
        solicitudService.crear(dto, sistema.getId());
    }

    private Optional<Ubicacion> ubicacionOrigenReposicion(Ubicacion destino) {
        for (String nombre : NOMBRES_ALMACEN_CANDIDATOS) {
            Optional<Ubicacion> u = ubicacionRepository.findByNombreIgnoreCase(nombre);
            if (u.isPresent() && !u.get().getIdUbicacion().equals(destino.getIdUbicacion())) {
                return u;
            }
        }
        return ubicacionRepository.findAll().stream()
                .filter(u -> !u.getIdUbicacion().equals(destino.getIdUbicacion()))
                .findFirst();
    }

    private static int calcularCantidadReposicion(InventarioUbicacion fila) {
        int actual = fila.getStockActual() != null ? fila.getStockActual() : 0;
        Integer max = fila.getStockMaximo();
        int min = fila.getStockMinimo() != null ? fila.getStockMinimo() : 0;
        if (max != null && max > actual) {
            return max - actual;
        }
        if (min > 0) {
            return min;
        }
        return Math.max(1, 1 - actual);
    }
}
