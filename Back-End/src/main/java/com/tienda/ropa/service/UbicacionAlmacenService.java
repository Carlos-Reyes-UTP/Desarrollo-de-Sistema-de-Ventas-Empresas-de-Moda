package com.tienda.ropa.service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.dto.AreaStockResumenDTO;
import com.tienda.ropa.dto.StockDesdeAlmacenDTO;
import com.tienda.ropa.dto.StockUbicacionDTO;
import com.tienda.ropa.dto.UbicacionDTO;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UbicacionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UbicacionAlmacenService {

    private static final List<String> RESERVADAS_PISO_LOWER = List.of(
            "almacén",
            "almacen",
            "bodega",
            "depósito",
            "deposito");

    private final UbicacionRepository ubicacionRepository;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final InventarioRepository inventarioRepository;
    private final InventarioService inventarioService;
    private final InventarioContextService inventarioContextService;

    public List<String> listarPisos() {
        return ubicacionRepository.findPisosDistintos(RESERVADAS_PISO_LOWER);
    }

    public List<String> listarPisos(Usuario usuario) {
        if (!esAlmaceneroRestringido(usuario)) {
            return listarPisos();
        }
        return listarPisosParaAlmacenero(usuario);
    }

    public List<UbicacionDTO> listarAreasDePiso(String nombrePiso) {
        if (nombrePiso == null || nombrePiso.isBlank()) {
            throw new IllegalArgumentException("El nombre del piso es obligatorio");
        }
        return ubicacionAreaRepository.findByPisoNombre(nombrePiso).stream()
                .map(UbicacionAlmacenService::toDTO)
                .toList();
    }

    public List<UbicacionDTO> listarAreasDePiso(String nombrePiso, Usuario usuario) {
        List<UbicacionDTO> areas = listarAreasDePiso(nombrePiso);
        if (!esAlmaceneroRestringido(usuario)) {
            return areas;
        }
        String nombreAreaAsignada = nombreAreaCatalogoAsignada(usuario);
        if (nombreAreaAsignada == null) {
            return List.of();
        }
        return areas.stream()
                .filter(dto -> nombreAreaAsignada.equalsIgnoreCase(dto.area()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AreaStockResumenDTO> resumenStockAreasDePiso(String nombrePiso) {
        if (nombrePiso == null || nombrePiso.isBlank()) {
            throw new IllegalArgumentException("El nombre del piso es obligatorio");
        }
        return ubicacionRepository.resumenStockPorPiso(nombrePiso);
    }

    @Transactional(readOnly = true)
    public List<AreaStockResumenDTO> resumenStockAreasDePiso(String nombrePiso, Usuario usuario) {
        List<AreaStockResumenDTO> resumen = resumenStockAreasDePiso(nombrePiso);
        if (!esAlmaceneroRestringido(usuario)) {
            return resumen;
        }
        String nombreAreaAsignada = nombreAreaCatalogoAsignada(usuario);
        if (nombreAreaAsignada == null) {
            return List.of();
        }
        return resumen.stream()
                .filter(r -> nombreAreaAsignada.equalsIgnoreCase(r.area()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> buscarStockOrigenDistribucion(String q, int limit, boolean soloAlmacen) {
        return buscarStockOrigenDistribucion(q, limit, soloAlmacen, null, null);
    }

    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> buscarStockOrigenDistribucion(
            String q, int limit, boolean soloAlmacen, Usuario usuario, String sector) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<Long> ids;
        if (soloAlmacen) {
            ids = inventarioContextService.resolverUbicacionesAlmacenParaConsulta(usuario, sector).stream()
                    .map(UbicacionArea::getIdUbicacionArea)
                    .toList();
        } else {
            ids = inventarioService.listarUbicacionesAreaAlmacen().stream()
                    .map(UbicacionArea::getIdUbicacionArea)
                    .toList();
        }
        if (ids.isEmpty()) {
            return List.of();
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

        List<Inventario> raw = inventarioRepository.findStockOrigenDistribucion(
                ids, sinFiltro, trimmed, pageable);

        return raw.stream()
                .limit(safeLimit)
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
    }

    public List<UbicacionDTO> listarOrigenesPosibles(Long idUbicacionAreaDestino) {
        if (idUbicacionAreaDestino == null) {
            throw new IllegalArgumentException("La ubicación-área destino es obligatoria");
        }
        return ubicacionAreaRepository.findOrigenesPosibles(idUbicacionAreaDestino, RESERVADAS_PISO_LOWER).stream()
                .map(UbicacionAlmacenService::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public StockDesdeAlmacenDTO stockDesdeAlmacen() {
        return stockDesdeAlmacen(null, null);
    }

    @Transactional(readOnly = true)
    public StockDesdeAlmacenDTO stockDesdeAlmacen(Usuario usuario, String sector) {
        List<UbicacionArea> areasAlmacen = inventarioContextService.resolverUbicacionesAlmacenParaConsulta(usuario, sector);
        List<StockUbicacionDTO> filasAlmacen = areasAlmacen.stream()
                .flatMap(ua -> inventarioRepository
                        .findStockPositivoByUbicacionArea(ua.getIdUbicacionArea()).stream())
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
        UbicacionArea referencia = areasAlmacen.isEmpty()
                ? inventarioService.ubicacionAreaAlmacen()
                : areasAlmacen.get(0);
        return new StockDesdeAlmacenDTO(
                referencia.getIdUbicacionArea(),
                InventarioService.UBICACION_ALMACEN_NOMBRE,
                filasAlmacen);
    }

    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> stockPorUbicacionArea(Long idUbicacionArea) {
        if (idUbicacionArea == null) {
            throw new IllegalArgumentException("La ubicación-área es obligatoria");
        }
        UbicacionArea ua = ubicacionAreaRepository.findByIdWithUbicacionYArea(idUbicacionArea)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ubicación no encontrada."));
        if (!ua.isActivo()
                || ua.getUbicacion() == null
                || !ua.getUbicacion().isActivo()
                || ua.getArea() == null
                || !ua.getArea().isActivo()) {
            throw new ResponseStatusException(
                    HttpStatus.GONE, "La ubicación no está activa.");
        }
        return inventarioRepository.findStockPositivoByUbicacionArea(idUbicacionArea).stream()
                .map(UbicacionAlmacenService::toStockDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockUbicacionDTO> stockPorUbicacionArea(Long idUbicacionArea, Usuario usuario) {
        if (esAlmaceneroRestringido(usuario)) {
            validarAccesoUbicacionAreaAlmacenero(usuario, idUbicacionArea);
        }
        return stockPorUbicacionArea(idUbicacionArea);
    }

    private boolean esAlmaceneroRestringido(Usuario usuario) {
        return inventarioContextService.esAlmaceneroDeLinea(usuario);
    }

    private List<String> listarPisosParaAlmacenero(Usuario usuario) {
        List<UbicacionArea> destinos = inventarioContextService.listarDestinosTrasladoParaAlmacenero(usuario);
        if (destinos.isEmpty()) {
            return List.of();
        }
        return destinos.stream()
                .filter(ua -> ua.getUbicacion() != null)
                .map(ua -> ua.getUbicacion().getNombre())
                .filter(nombre -> nombre != null && !esPisoReservado(nombre))
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    private static boolean esPisoReservado(String nombrePiso) {
        if (nombrePiso == null) {
            return true;
        }
        String lower = nombrePiso.trim().toLowerCase();
        return RESERVADAS_PISO_LOWER.contains(lower);
    }

    private String nombreAreaCatalogoAsignada(Usuario usuario) {
        if (usuario == null || usuario.getAreaAsignado() == null || usuario.getAreaAsignado().getArea() == null) {
            return null;
        }
        return usuario.getAreaAsignado().getArea().getNombre();
    }

    private void validarAccesoUbicacionAreaAlmacenero(Usuario usuario, Long idUbicacionArea) {
        Set<Long> permitidos = inventarioContextService.listarDestinosTrasladoParaAlmacenero(usuario).stream()
                .map(UbicacionArea::getIdUbicacionArea)
                .collect(Collectors.toSet());
        if (!permitidos.contains(idUbicacionArea)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No tiene permiso para consultar el stock de esta ubicación.");
        }
    }

    private static UbicacionDTO toDTO(UbicacionArea ua) {
        return new UbicacionDTO(
                ua.getIdUbicacionArea(),
                ua.getUbicacion() != null ? ua.getUbicacion().getNombre() : null,
                ua.getArea() != null ? ua.getArea().getNombre() : null,
                null);
    }

    private static StockUbicacionDTO toStockDTO(Inventario fila) {
        ProductoVariante v = fila.getVariante();
        UbicacionArea ua = fila.getUbicacionArea();
        return new StockUbicacionDTO(
                v.getIdProductoVariante(),
                v.getProducto() != null ? v.getProducto().getIdProducto() : null,
                v.getProducto() != null ? v.getProducto().getNombre() : null,
                v.getProducto() != null ? v.getProducto().getCodigoIdentificacion() : null,
                v.getColor(),
                v.getTalla(),
                v.getSku(),
                fila.getStock(),
                ua.getIdUbicacionArea(),
                ua.getUbicacion() != null ? ua.getUbicacion().getNombre() : null,
                ua.getArea() != null ? ua.getArea().getNombre() : null);
    }
}
