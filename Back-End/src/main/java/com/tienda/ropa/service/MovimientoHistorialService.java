package com.tienda.ropa.service;

import com.tienda.ropa.dto.MovimientoDetalleDTO;
import com.tienda.ropa.dto.MovimientoHistorialDTO;
import com.tienda.ropa.entity.MovimientoInventario;
import com.tienda.ropa.repository.MovimientoInventarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovimientoHistorialService {

    private final MovimientoInventarioRepository movimientoInventarioRepository;

    @Transactional(readOnly = true)
    public Page<MovimientoHistorialDTO> getHistorialMes(int mes, int anio, Long idArea, LocalDate fechaDesde, LocalDate fechaHasta, Pageable pageable) {
        LocalDate primerDia = LocalDate.of(anio, mes, 1);
        LocalDate ultimoDia = primerDia.withDayOfMonth(primerDia.lengthOfMonth());

        LocalDateTime inicio = (fechaDesde != null && !fechaDesde.isBefore(primerDia))
                ? fechaDesde.atStartOfDay()
                : LocalDateTime.of(primerDia, LocalTime.MIN);

        LocalDateTime fin = (fechaHasta != null && !fechaHasta.isAfter(ultimoDia))
                ? fechaHasta.atTime(LocalTime.MAX)
                : LocalDateTime.of(ultimoDia, LocalTime.MAX);

        Page<UUID> gruposPage = movimientoInventarioRepository.findGruposByMes(inicio, fin, idArea, pageable);

        List<MovimientoHistorialDTO> dtoList = gruposPage.getContent().stream()
                .map(this::buildHistorialDTO)
                .toList();

        return new PageImpl<>(dtoList, pageable, gruposPage.getTotalElements());
    }

    private MovimientoHistorialDTO buildHistorialDTO(UUID grupo) {
        List<MovimientoInventario> movimientos = movimientoInventarioRepository.findByGrupoMovimiento(grupo);

        if (movimientos.isEmpty()) return null;

        MovimientoInventario primero = movimientos.getFirst();

        String usuarioNombre = primero.getUsuario() != null
                ? primero.getUsuario().getUsuario()
                : "Sistema";

        String origenNombre = primero.getUbicacionAreaOrigen() != null
                ? primero.getUbicacionAreaOrigen().getUbicacion().getNombre() + " · " + primero.getUbicacionAreaOrigen().getArea().getNombre()
                : "—";

        String destinoNombre = primero.getUbicacionAreaDestino() != null
                ? primero.getUbicacionAreaDestino().getUbicacion().getNombre() + " · " + primero.getUbicacionAreaDestino().getArea().getNombre()
                : "—";

        String productoNombre = primero.getVariante().getProducto().getNombre();
        Long idProducto = primero.getVariante().getProducto().getIdProducto();

        int cantidadTotal = movimientos.stream()
                .mapToInt(MovimientoInventario::getCantidad)
                .sum();

        LocalDateTime fecha = primero.getFechaCreacion();

        List<MovimientoDetalleDTO> detalles = movimientos.stream()
                .map(m -> new MovimientoDetalleDTO(
                        m.getVariante().getIdProductoVariante(),
                        m.getVariante().getColor(),
                        m.getVariante().getTalla(),
                        m.getVariante().getSku(),
                        m.getCantidad()))
                .toList();

        return new MovimientoHistorialDTO(
                grupo, usuarioNombre, origenNombre, destinoNombre,
                productoNombre, idProducto, cantidadTotal, fecha, detalles);
    }
}
