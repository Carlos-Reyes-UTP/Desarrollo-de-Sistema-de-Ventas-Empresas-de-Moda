package com.tienda.ropa.service;

import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.dto.VendedorCatalogoBusquedaDTO;
import com.tienda.ropa.dto.VendedorCatalogoPorCodigoDTO;
import com.tienda.ropa.dto.VendedorCrearSolicitudRequest;
import com.tienda.ropa.dto.VendedorProductoResumenDTO;
import com.tienda.ropa.dto.VendedorSolicitudResumenDTO;
import com.tienda.ropa.dto.VendedorVarianteCoincidenciaDTO;
import com.tienda.ropa.dto.VendedorVarianteStockDTO;
import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VendedorService {

    private static final int MAX_COINCIDENCIAS = 25;

    private final CodigoBarrasService codigoBarrasService;
    private final ProductoService productoService;
    private final ProductoVarianteService productoVarianteService;
    private final InventarioUbicacionService inventarioUbicacionService;
    private final SolicitudService solicitudService;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final SolicitudRepository solicitudRepository;

    @Transactional(readOnly = true)
    public VendedorCatalogoBusquedaDTO buscarCatalogo(String terminoRaw) {
        String termino = terminoRaw == null ? "" : terminoRaw.trim();
        if (termino.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingresa código o nombre del producto");
        }

        Long idVariantePreseleccionada = null;
        Producto producto = null;

        try {
            ProductoVariante v = codigoBarrasService.buscarVariantePorCodigoBarras(termino);
            idVariantePreseleccionada = v.getIdProductoVariante();
            producto = v.getProducto();
        } catch (Exception ignored) {
            // continuar
        }

        if (producto == null) {
            try {
                producto = codigoBarrasService.buscarPorCodigoBarras(termino);
            } catch (Exception ignored) {
                // continuar
            }
        }

        if (producto == null) {
            List<Producto> porIdentificacion = productoService.obtenerProductosPorCodigo(termino);
            if (!porIdentificacion.isEmpty()) {
                producto = porIdentificacion.get(0);
            }
        }

        if (producto == null) {
            var pageVariantes = productoVarianteService.obtenerVariantesPaginadasParaCajero(
                    termino, PageRequest.of(0, MAX_COINCIDENCIAS));
            List<Object[]> filasVariante = pageVariantes.getContent();
            if (filasVariante.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró el producto");
            }
            if (filasVariante.size() == 1) {
                VendedorVarianteCoincidenciaDTO fila = mapearCoincidenciaVariante(filasVariante.get(0));
                producto = productoService.obtenerProductoPorId(fila.idProducto())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
                idVariantePreseleccionada = fila.idProductoVariante();
            } else {
                List<VendedorVarianteCoincidenciaDTO> opciones = filasVariante.stream()
                        .map(this::mapearCoincidenciaVariante)
                        .toList();
                return new VendedorCatalogoBusquedaDTO(true, opciones, null);
            }
        }

        VendedorCatalogoPorCodigoDTO catalogo = construirCatalogo(producto, idVariantePreseleccionada);
        return new VendedorCatalogoBusquedaDTO(false, List.of(), catalogo);
    }

    @Transactional(readOnly = true)
    public VendedorCatalogoPorCodigoDTO catalogoPorProductoId(Long idProducto) {
        Producto producto = productoService.obtenerProductoPorId(idProducto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        return construirCatalogo(producto, null);
    }

    @Transactional(readOnly = true)
    public VendedorCatalogoPorCodigoDTO catalogoPorVarianteId(Long idVariante) {
        ProductoVariante variante = productoVarianteService.obtenerVariantePorId(idVariante)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Variante no encontrada"));
        Producto producto = variante.getProducto();
        return construirCatalogo(producto, idVariante);
    }

    /**
     * Misma convención de columnas que {@link com.tienda.ropa.controller.CajeroProductoController#mapearResultadoAVariante}.
     */
    private VendedorVarianteCoincidenciaDTO mapearCoincidenciaVariante(Object[] row) {
        long idVariante = toLong(row[0]);
        String codigoBarras = row[1] != null ? String.valueOf(row[1]) : "";
        int stockAlmacen = row[2] instanceof Number n ? n.intValue() : 0;
        long idProducto = toLong(row[3]);
        String nombreProducto = row[4] != null ? String.valueOf(row[4]) : "";
        BigDecimal precioUnitario = toBigDecimal(row[8]);
        String talla = row[10] != null ? String.valueOf(row[10]) : "";
        String color = row[12] != null ? String.valueOf(row[12]) : "";
        String sku = row[15] != null ? String.valueOf(row[15]) : "";
        return new VendedorVarianteCoincidenciaDTO(
                idVariante,
                idProducto,
                nombreProducto,
                talla,
                color,
                sku,
                codigoBarras,
                precioUnitario,
                stockAlmacen);
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private VendedorCatalogoPorCodigoDTO construirCatalogo(Producto producto, Long idVariantePreseleccionada) {
        Long idProducto = producto.getIdProducto();
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProducto(idProducto);
        List<VendedorVarianteStockDTO> filas = new ArrayList<>();
        for (ProductoVariante pv : variantes) {
            int stockAlmacen = inventarioUbicacionService.stockTotalVariante(pv.getIdProductoVariante());
            filas.add(new VendedorVarianteStockDTO(
                    pv.getIdProductoVariante(),
                    pv.getTalla(),
                    pv.getColor(),
                    pv.getCodigoBarras(),
                    stockAlmacen));
        }

        int stockTotal = filas.stream().mapToInt(VendedorVarianteStockDTO::stockAlmacen).sum();

        VendedorProductoResumenDTO resumen = new VendedorProductoResumenDTO(
                idProducto,
                producto.getNombre(),
                producto.getPrecioUnitario(),
                stockTotal);

        return new VendedorCatalogoPorCodigoDTO(resumen, idVariantePreseleccionada, filas);
    }

    @Transactional
    public Solicitud crearSolicitud(VendedorCrearSolicitudRequest req, Long idUsuario) {
        if (req.idVariante() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La variante es obligatoria");
        }
        if (req.cantidad() == null || req.cantidad() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero");
        }

        int stockAlmacen = inventarioUbicacionService.stockTotalVariante(req.idVariante());
        if (req.cantidad() > stockAlmacen) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La cantidad supera el stock disponible en el sistema (" + stockAlmacen + ")");
        }

        Ubicacion almacen = inventarioUbicacionService.ubicacionAlmacen();
        Ubicacion principal = inventarioUbicacionService.ubicacionPrincipal();

        TipoSolicitud tipo = TipoSolicitud.REPOSICION;
        if (req.tipoSolicitud() != null && !req.tipoSolicitud().isBlank()) {
            try {
                tipo = TipoSolicitud.valueOf(req.tipoSolicitud().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "tipoSolicitud debe ser VENTA o REPOSICION");
            }
        }

        CrearSolicitudDTO dto = new CrearSolicitudDTO(
                tipo.name(),
                almacen.getIdUbicacion(),
                principal.getIdUbicacion(),
                List.of(new DetalleSolicitudLineaDTO(req.idVariante(), req.cantidad())));

        return solicitudService.crear(dto, idUsuario);
    }

    @Transactional(readOnly = true)
    public List<VendedorSolicitudResumenDTO> listarMisSolicitudes(Long idUsuario, Instant desde, Instant hasta) {
        List<Solicitud> solicitudes = solicitudRepository
                .findByUsuario_IdAndFechaCreacionBetweenOrderByFechaCreacionDesc(idUsuario, desde, hasta);

        List<VendedorSolicitudResumenDTO> resultado = new ArrayList<>();
        for (Solicitud s : solicitudes) {
            List<DetalleSolicitud> detalles = detalleSolicitudRepository.findBySolicitud_IdSolicitud(s.getIdSolicitud());
            if (detalles.isEmpty()) {
                continue;
            }
            DetalleSolicitud d = detalles.get(0);
            ProductoVariante v = d.getVariante();
            Producto p = v.getProducto();
            resultado.add(new VendedorSolicitudResumenDTO(
                    s.getIdSolicitud(),
                    s.getTipoSolicitud().name(),
                    s.getEstado().name(),
                    s.getFechaCreacion(),
                    d.getCantidad(),
                    v.getIdProductoVariante(),
                    p.getNombre(),
                    v.getTalla(),
                    v.getColor()));
        }
        return resultado;
    }
}
