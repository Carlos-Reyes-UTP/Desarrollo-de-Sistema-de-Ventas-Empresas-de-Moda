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



/**

 * Tras una salida de stock en un área de piso, evalúa mínimos y genera solicitudes

 * de reposición desde Almacén hacia esa misma ubicacion_area.

 */

@Service

@RequiredArgsConstructor

public class ReposicionAutomaticaService {



    public static final String USUARIO_SISTEMA = "SISTEMA";



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

        if (detalleSolicitudRepository.existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_Estado(

                idVariante, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE)) {

            return;

        }

        int cantidad = calcularCantidadReposicion(fila);

        UbicacionArea origen = inventarioService.resolverOrigenAlmacenConStock(idVariante, cantidad, destino);

        if (origen.getIdUbicacionArea().equals(destino.getIdUbicacionArea())) {

            return;

        }

        Usuario sistema = usuarioRepository.findByUsuario(USUARIO_SISTEMA)

                .orElseThrow(() -> new IllegalStateException(

                        "Usuario '" + USUARIO_SISTEMA + "' no existe; ejecute migración V7 o cree el usuario técnico."));



        CrearSolicitudDTO dto = new CrearSolicitudDTO(

                TipoSolicitud.REPOSICION.toString(),

                origen.getIdUbicacionArea(),

                destino.getIdUbicacionArea(),

                List.of(new DetalleSolicitudLineaDTO(idVariante, cantidad)),

                null);

        solicitudService.crear(dto, sistema.getId());

    }



    private static int calcularCantidadReposicion(Inventario fila) {

        int actual = fila.getStock() != null ? fila.getStock() : 0;

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


