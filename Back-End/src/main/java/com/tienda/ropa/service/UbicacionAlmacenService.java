package com.tienda.ropa.service;

import com.tienda.ropa.dto.AreaStockResumenDTO;
import com.tienda.ropa.dto.StockDesdeAlmacenDTO;
import com.tienda.ropa.dto.StockUbicacionDTO;
import com.tienda.ropa.dto.UbicacionDTO;
import com.tienda.ropa.entity.InventarioUbicacion;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.repository.InventarioUbicacionRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Consultas auxiliares para la UI almacenera: listar pisos, áreas, orígenes
 * posibles de un traslado y stock por ubicación.
 */
@Service
@RequiredArgsConstructor
public class UbicacionAlmacenService {

    /**
     * Nombres reservados que NO aparecen como "pisos" en la UI almacenera
     * (en minúsculas para comparar con LOWER(nombre)).
     */
    private static final List<String> RESERVADAS_PISO_LOWER = List.of(
            "principal",
            "almacén",
            "almacen",
            "bodega",
            "depósito",
            "deposito"
    );

    /**
     * Nombres reservados que se excluyen como origen de traslado: solo Principal
     * (no movemos mercadería desde la tienda). Almacén SÍ es origen válido.
     */
    private static final List<String> RESERVADAS_ORIGEN_LOWER = List.of("principal");

    private final UbicacionRepository ubicacionRepository;
    private final InventarioUbicacionRepository inventarioUbicacionRepository;
    private final InventarioUbicacionService inventarioUbicacionService;

    public List<String> listarPisos() {
        return ubicacionRepository.findPisosDistintos(RESERVADAS_PISO_LOWER);
    }

    public List<UbicacionDTO> listarAreasDePiso(String nombrePiso) {
        if (nombrePiso == null || nombrePiso.isBlank()) {
            throw new IllegalArgumentException("El nombre del piso es obligatorio");
        }
        return ubicacionRepository.findAreasDePiso(nombrePiso).stream()
                .map(UbicacionAlmacenService::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AreaStockResumenDTO> resumenStockAreasDePiso(String nombrePiso) {
        if (nombrePiso == null || nombrePiso.isBlank()) {
            throw new IllegalArgumentException("El nombre del piso es obligatorio");
        }
        return ubicacionRepository.resumenStockPorPiso(nombrePiso);
    }

    /**
     * Sugerencias para traslado desde almacén hacia pisos: por defecto Almacén + Principal (merge por variante, prioriza Almacén).
     * Si {@code soloAlmacen} es true, solo filas con stock en la ubicación Almacén (sin mezclar Principal).
     */
    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> buscarStockOrigenDistribucion(String q, int limit, boolean soloAlmacen) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        Ubicacion almacen = inventarioUbicacionService.ubicacionAlmacen();
        long idAlmacen = almacen.getIdUbicacion();

        List<Long> ids;
        if (soloAlmacen) {
            ids = List.of(idAlmacen);
        } else {
            Ubicacion principal = inventarioUbicacionService.ubicacionPrincipal();
            ids = List.of(idAlmacen, principal.getIdUbicacion());
        }

        String trimmed = q == null ? "" : q.trim();
        boolean sinFiltro = trimmed.isEmpty();
        int fetchSize = Math.min(safeLimit * 4, 200);
        Pageable pageable = PageRequest.of(
                0,
                fetchSize,
                Sort.by(
                        Sort.Order.asc("variante.producto.nombre"),
                        Sort.Order.asc("variante.color"),
                        Sort.Order.asc("variante.talla")));

        List<InventarioUbicacion> raw = inventarioUbicacionRepository.findStockOrigenDistribucion(
                ids, sinFiltro, trimmed, pageable);
        if (!soloAlmacen) {
            raw.sort(Comparator.comparing((InventarioUbicacion i) ->
                    i.getUbicacion().getIdUbicacion().equals(idAlmacen) ? 0 : 1));
        }

        Map<Long, InventarioUbicacion> porVariante = new LinkedHashMap<>();
        for (InventarioUbicacion row : raw) {
            Long idVar = row.getVariante().getIdProductoVariante();
            porVariante.putIfAbsent(idVar, row);
        }

        return porVariante.values().stream()
                .limit(safeLimit)
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
    }

    public List<UbicacionDTO> listarOrigenesPosibles(Long idDestino) {
        if (idDestino == null) {
            throw new IllegalArgumentException("La ubicación destino es obligatoria");
        }
        return ubicacionRepository.findOrigenesPosibles(idDestino, RESERVADAS_ORIGEN_LOWER).stream()
                .map(UbicacionAlmacenService::toDTO)
                .toList();
    }

    /**
     * Stock con cantidad positiva para distribuir a pisos: primero Almacén; si una variante
     * solo tiene stock en Principal (típico tras migración V7), se incluye esa fila.
     */
    @Transactional(readOnly = true)
    public StockDesdeAlmacenDTO stockDesdeAlmacen() {
        Ubicacion almacen = inventarioUbicacionService.ubicacionAlmacen();
        Ubicacion principal = inventarioUbicacionService.ubicacionPrincipal();

        List<StockUbicacionDTO> filasAlmacen = inventarioUbicacionRepository
                .findStockPositivoByUbicacion(almacen.getIdUbicacion()).stream()
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
        List<StockUbicacionDTO> filasPrincipal = inventarioUbicacionRepository
                .findStockPositivoByUbicacion(principal.getIdUbicacion()).stream()
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();

        Map<Long, StockUbicacionDTO> porVariante = new LinkedHashMap<>();
        for (StockUbicacionDTO fila : filasAlmacen) {
            porVariante.put(fila.idVariante(), fila);
        }
        for (StockUbicacionDTO fila : filasPrincipal) {
            porVariante.putIfAbsent(fila.idVariante(), fila);
        }

        List<StockUbicacionDTO> merged = new ArrayList<>(porVariante.values());
        merged.sort(Comparator.comparing(
                s -> Optional.ofNullable(s.nombreProducto()).orElse(""),
                String.CASE_INSENSITIVE_ORDER));

        String etiquetaAlmacen = almacen.getArea() != null && !almacen.getArea().isBlank()
                ? almacen.getNombre() + " · " + almacen.getArea()
                : almacen.getNombre();
        String leyenda = filasAlmacen.isEmpty() && !filasPrincipal.isEmpty()
                ? etiquetaAlmacen + " (incluye stock aún en Principal por migración)"
                : etiquetaAlmacen;

        return new StockDesdeAlmacenDTO(almacen.getIdUbicacion(), leyenda, merged);
    }

    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> stockPorUbicacion(Long idUbicacion) {
        if (idUbicacion == null) {
            throw new IllegalArgumentException("La ubicación es obligatoria");
        }
        return inventarioUbicacionRepository.findStockPositivoByUbicacion(idUbicacion).stream()
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
    }

    private static UbicacionDTO toDTO(Ubicacion u) {
        return new UbicacionDTO(u.getIdUbicacion(), u.getNombre(), u.getArea(), u.getDescripcion());
    }

    private static StockUbicacionDTO toStockDTO(InventarioUbicacion fila) {
        ProductoVariante v = fila.getVariante();
        Ubicacion u = fila.getUbicacion();
        return new StockUbicacionDTO(
                v.getIdProductoVariante(),
                v.getProducto() != null ? v.getProducto().getIdProducto() : null,
                v.getProducto() != null ? v.getProducto().getNombre() : null,
                v.getProducto() != null ? v.getProducto().getCodigoIdentificacion() : null,
                v.getColor(),
                v.getTalla(),
                v.getSku(),
                fila.getStockActual(),
                u.getIdUbicacion(),
                u.getNombre(),
                u.getArea()
        );
    }
}
