package com.tienda.ropa.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.dto.AlmacenSolicitudCardDTO;
import com.tienda.ropa.dto.AlmacenSolicitudLineaDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.SolicitudRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.service.SolicitudService;
import com.tienda.ropa.service.TrasladoInventarioService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SolicitudServiceImpl implements SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final UbicacionRepository ubicacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoVarianteRepository productoVarianteRepository;
    private final TrasladoInventarioService trasladoInventarioService;

    @Override
    @Transactional
    public Solicitud crear(CrearSolicitudDTO dto, Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return persistir(dto, usuario);
    }

    @Override
    @Transactional
    public Solicitud crearSistema(CrearSolicitudDTO dto) {
        Usuario sistema = usuarioRepository.findByUsuario("SISTEMA").orElse(null);
        return persistir(dto, sistema);
    }

    private Solicitud persistir(CrearSolicitudDTO dto, Usuario usuario) {
        if (dto.detalles() == null || dto.detalles().isEmpty()) {
            throw new IllegalArgumentException("La solicitud debe incluir al menos un detalle");
        }
        Ubicacion origen = ubicacionRepository.findById(dto.idUbicacionOrigen())
                .orElseThrow(() -> new IllegalArgumentException("Ubicación origen no encontrada"));
        Ubicacion destino = ubicacionRepository.findById(dto.idUbicacionDestino())
                .orElseThrow(() -> new IllegalArgumentException("Ubicación destino no encontrada"));

        Solicitud s = new Solicitud();
        s.setUsuario(usuario);
        s.setTipoSolicitud(TipoSolicitud.valueOf(dto.tipoSolicitud().trim().toUpperCase()));
        s.setEstado(EstadoSolicitud.PENDIENTE);
        s.setUbicacionOrigen(origen);
        s.setUbicacionDestino(destino);
        Solicitud guardada = solicitudRepository.save(s);

        for (DetalleSolicitudLineaDTO linea : dto.detalles()) {
            if (linea.cantidad() == null || linea.cantidad() <= 0) {
                throw new IllegalArgumentException("Cantidad inválida en detalle");
            }
            ProductoVariante v = productoVarianteRepository.findById(linea.idVariante())
                    .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada: " + linea.idVariante()));
            DetalleSolicitud d = new DetalleSolicitud();
            d.setSolicitud(guardada);
            d.setVariante(v);
            d.setCantidad(linea.cantidad());
            detalleSolicitudRepository.save(d);
        }
        return guardada;
    }

    @Override
    public List<Solicitud> listar() {
        return solicitudRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlmacenSolicitudCardDTO> listarColaPendientes() {
        List<Solicitud> lista = solicitudRepository.findColaPendientesConDetalles(EstadoSolicitud.PENDIENTE);
        return lista.stream().map(this::toCard).collect(Collectors.toCollection(ArrayList::new));
    }

    private AlmacenSolicitudCardDTO toCard(Solicitud s) {
        Long idUsuario = s.getUsuario() != null ? s.getUsuario().getId() : null;
        String nombreVendedor = s.getUsuario() != null ? s.getUsuario().getUsuario() : "Sistema";
        List<DetalleSolicitud> detalles = s.getDetalles() != null ? s.getDetalles() : List.of();
        List<AlmacenSolicitudLineaDTO> lineas = detalles.stream().map(this::toLinea).toList();
        return new AlmacenSolicitudCardDTO(
                s.getIdSolicitud(),
                s.getTipoSolicitud().name(),
                s.getFechaCreacion(),
                idUsuario,
                nombreVendedor,
                lineas);
    }

    private AlmacenSolicitudLineaDTO toLinea(DetalleSolicitud d) {
        ProductoVariante v = d.getVariante();
        Producto p = v.getProducto();
        String sku = (v.getSku() != null && !v.getSku().isBlank())
                ? v.getSku()
                : p.getCodigoIdentificacion();
        String descripcion = p.getNombre() + " · Talla " + v.getTalla() + " · " + v.getColor();
        return new AlmacenSolicitudLineaDTO(v.getIdProductoVariante(), sku, descripcion, d.getCantidad());
    }

    @Override
    @Transactional
    public Solicitud atenderSolicitud(Long idSolicitud) {
        Solicitud s = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (s.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud ya no está pendiente");
        }

        // Si el almacenero atiende la solicitud, se asume que el stock se mueve físicamente
        // desde la ubicación origen hacia la destino (venta/reposición).
        // Esto asegura que, cuando el cajero realice la venta, exista stock en el área correspondiente.
        List<DetalleSolicitud> detalles = detalleSolicitudRepository.findBySolicitud_IdSolicitud(s.getIdSolicitud());
        if (detalles != null && !detalles.isEmpty()) {
            Ubicacion origen = s.getUbicacionOrigen();
            Ubicacion destino = s.getUbicacionDestino();
            if (origen == null || destino == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud no tiene ubicación origen/destino");
            }
            for (DetalleSolicitud d : detalles) {
                ProductoVariante v = d.getVariante();
                Integer cant = d.getCantidad();
                if (v == null || v.getIdProductoVariante() == null || cant == null || cant <= 0) {
                    continue;
                }
                trasladoInventarioService.mover(new TrasladoInventarioDTO(
                        v.getIdProductoVariante(),
                        origen.getIdUbicacion(),
                        destino.getIdUbicacion(),
                        cant
                ));
            }
        }

        s.setEstado(EstadoSolicitud.ATENDIDO);
        s.setMotivoRechazo(null);
        return solicitudRepository.save(s);
    }

    @Override
    @Transactional
    public Solicitud rechazarSolicitud(Long idSolicitud, MotivoRechazoSolicitud motivo) {
        Solicitud s = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (s.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud ya no está pendiente");
        }
        s.setEstado(EstadoSolicitud.CANCELADO);
        s.setMotivoRechazo(motivo);
        return solicitudRepository.save(s);
    }

    @Override
    @Transactional
    public Solicitud cambiarEstado(Long idSolicitud, String nuevoEstado) {
        Solicitud s = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new IllegalArgumentException("Solicitud no encontrada"));
        EstadoSolicitud target = EstadoSolicitud.valueOf(nuevoEstado.trim().toUpperCase());
        if ((target == EstadoSolicitud.ATENDIDO || target == EstadoSolicitud.CANCELADO)
                && s.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se puede atender o cancelar solicitudes pendientes");
        }

        if (target == EstadoSolicitud.ATENDIDO && s.getEstado() == EstadoSolicitud.PENDIENTE) {
            // Mantener consistencia: al marcar como ATENDIDO, mover stock origen -> destino.
            List<DetalleSolicitud> detalles = detalleSolicitudRepository.findBySolicitud_IdSolicitud(s.getIdSolicitud());
            if (detalles != null && !detalles.isEmpty()) {
                Ubicacion origen = s.getUbicacionOrigen();
                Ubicacion destino = s.getUbicacionDestino();
                if (origen == null || destino == null) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud no tiene ubicación origen/destino");
                }
                for (DetalleSolicitud d : detalles) {
                    ProductoVariante v = d.getVariante();
                    Integer cant = d.getCantidad();
                    if (v == null || v.getIdProductoVariante() == null || cant == null || cant <= 0) {
                        continue;
                    }
                    trasladoInventarioService.mover(new TrasladoInventarioDTO(
                            v.getIdProductoVariante(),
                            origen.getIdUbicacion(),
                            destino.getIdUbicacion(),
                            cant
                    ));
                }
            }
        }

        s.setEstado(target);
        if (target == EstadoSolicitud.ATENDIDO) {
            s.setMotivoRechazo(null);
        }
        return solicitudRepository.save(s);
    }
}
