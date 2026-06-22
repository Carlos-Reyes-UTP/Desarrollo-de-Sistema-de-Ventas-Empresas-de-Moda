package com.tienda.ropa.service.impl;

import com.tienda.ropa.dto.AlmacenSolicitudLineaDTO;
import com.tienda.ropa.dto.SupervisorHistorialSolicitudDTO;
import com.tienda.ropa.entity.*;
import com.tienda.ropa.repository.SolicitudRepository;
import com.tienda.ropa.service.InventarioService;
import com.tienda.ropa.service.SupervisorSolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.TipoSolicitud;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupervisorSolicitudServiceImpl implements SupervisorSolicitudService {

    private final SolicitudRepository solicitudRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SupervisorHistorialSolicitudDTO> listarHistorial(LocalDate fecha, Long idArea, String tipoSolicitud) {
        ZoneId zone = ZoneId.of("America/Lima");
        Instant desde = fecha.atStartOfDay(zone).toInstant();
        Instant hasta = fecha.plusDays(1).atStartOfDay(zone).toInstant();

        List<EstadoSolicitud> estados = List.of(EstadoSolicitud.ATENDIDO, EstadoSolicitud.CANCELADO);
        TipoSolicitud tipo = null;
        if (tipoSolicitud != null && !tipoSolicitud.isBlank()) {
            tipo = TipoSolicitud.valueOf(tipoSolicitud.trim().toUpperCase());
        }

        List<Solicitud> lista = solicitudRepository.findHistorialConFiltros(estados, desde, hasta, idArea, tipo);

        return lista.stream().map(this::toDTO).collect(Collectors.toCollection(ArrayList::new));
    }

    private SupervisorHistorialSolicitudDTO toDTO(Solicitud s) {
        Long idUsuario = s.getUsuario() != null ? s.getUsuario().getId() : null;
        String nombreVendedor = s.getUsuario() != null ? s.getUsuario().getUsuario() : "Sistema";
        String nombreAtendio = s.getUsuarioAtendio() != null ? s.getUsuarioAtendio().getUsuario() : null;
        List<DetalleSolicitud> detalles = s.getDetalles() != null ? s.getDetalles() : List.of();
        List<AlmacenSolicitudLineaDTO> lineas = detalles.stream().map(this::toLinea).toList();
        UbicacionArea origen = s.getUbicacionAreaOrigen();
        UbicacionArea destino = s.getUbicacionAreaDestino();
        Long idOrigen = origen != null ? origen.getIdUbicacionArea() : null;
        Long idDestino = destino != null ? destino.getIdUbicacionArea() : null;
        Area areaOrigen = origen != null ? origen.getArea() : null;
        Area areaDestino = destino != null ? destino.getArea() : null;
        String pisoOrigen = origen != null && origen.getUbicacion() != null
                ? origen.getUbicacion().getNombre() : null;
        String pisoDestino = destino != null && destino.getUbicacion() != null
                ? destino.getUbicacion().getNombre() : null;
        String sectorOrigen = areaOrigen != null ? areaOrigen.getNombre() : null;
        String sectorDestino = areaDestino != null ? areaDestino.getNombre() : null;
        String etiquetaOrigen = origen != null ? InventarioService.etiquetaUbicacionArea(origen) : null;
        String etiquetaDestino = destino != null ? InventarioService.etiquetaUbicacionArea(destino) : null;
        return new SupervisorHistorialSolicitudDTO(
                s.getIdSolicitud(),
                s.getTipoSolicitud().name(),
                s.getEstado().name(),
                s.getFechaCreacion(),
                idUsuario,
                nombreVendedor,
                idOrigen,
                pisoOrigen,
                sectorOrigen,
                etiquetaOrigen,
                idDestino,
                pisoDestino,
                sectorDestino,
                etiquetaDestino,
                s.getCodigoLote(),
                s.getMotivoRechazo() != null ? s.getMotivoRechazo().name() : null,
                s.getComentarioRechazo(),
                nombreAtendio,
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
}
