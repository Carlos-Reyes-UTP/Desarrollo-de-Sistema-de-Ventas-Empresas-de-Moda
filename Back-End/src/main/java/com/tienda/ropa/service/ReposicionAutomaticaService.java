package com.tienda.ropa.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Tras una salida de stock en la ubicación de tienda (Principal), evalúa mínimos
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

    @Transactional
    public void evaluarTrasSalidaEnPrincipal(Long idVariante) {
        Ubicacion principal = ubicacionPrincipal();
        Optional<InventarioUbicacion> filaOpt = inventarioUbicacionRepository
                .findByVariante_IdProductoVarianteAndUbicacion_IdUbicacion(idVariante, principal.getIdUbicacion());
        if (filaOpt.isEmpty()) {
            return;
        }
        InventarioUbicacion fila = filaOpt.get();
        int actual = fila.getStockActual() != null ? fila.getStockActual() : 0;
        int min = fila.getStockMinimo() != null ? fila.getStockMinimo() : 0;
        if (actual > min) {
            return;
        }
        if (detalleSolicitudRepository.existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_Estado(
                idVariante, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE)) {
            return;
        }
        Optional<Ubicacion> origenOpt = ubicacionOrigenReposicion(principal);
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
                principal.getIdUbicacion(),
                List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad))
        );
        solicitudService.crear(dto, sistema.getId());
    }

    private Ubicacion ubicacionPrincipal() {
        return ubicacionRepository.findByNombreIgnoreCase(InventarioUbicacionService.UBICACION_PRINCIPAL_NOMBRE)
                .orElseThrow(() -> new IllegalStateException(
                        "No existe la ubicación '" + InventarioUbicacionService.UBICACION_PRINCIPAL_NOMBRE + "'"));
    }

    private Optional<Ubicacion> ubicacionOrigenReposicion(Ubicacion principal) {
        for (String nombre : NOMBRES_ALMACEN_CANDIDATOS) {
            Optional<Ubicacion> u = ubicacionRepository.findByNombreIgnoreCase(nombre);
            if (u.isPresent() && !u.get().getIdUbicacion().equals(principal.getIdUbicacion())) {
                return u;
            }
        }
        return ubicacionRepository.findAll().stream()
                .filter(u -> !u.getIdUbicacion().equals(principal.getIdUbicacion()))
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
