package com.tienda.ropa.service;

import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.dto.DetalleSolicitudLineaDTO;
import com.tienda.ropa.dto.VendedorCatalogoBusquedaDTO;
import com.tienda.ropa.dto.VendedorCatalogoPorCodigoDTO;
import com.tienda.ropa.dto.CrearSolicitudLoteResult;
import com.tienda.ropa.dto.VendedorCrearSolicitudLoteRequest;
import com.tienda.ropa.dto.VendedorCrearSolicitudRequest;
import com.tienda.ropa.dto.VendedorProductoResumenDTO;
import com.tienda.ropa.dto.VendedorSolicitudResumenDTO;
import com.tienda.ropa.dto.VendedorUbicacionDTO;
import com.tienda.ropa.dto.VendedorVarianteCoincidenciaDTO;
import com.tienda.ropa.dto.VendedorVarianteStockDTO;
import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.SolicitudRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class VendedorService {

    private static final int MAX_COINCIDENCIAS = 25;

    /** Nombres reservados que NO son áreas de piso vendible. */
    private static final List<String> RESERVADAS_LOWER = List.of(
            "almacén", "almacen", "bodega", "depósito", "deposito");

    private final CodigoBarrasService codigoBarrasService;
    private final ProductoService productoService;
    private final ProductoVarianteService productoVarianteService;
    private final InventarioService inventarioService;
    private final InventarioRepository inventarioRepository;
    private final SolicitudService solicitudService;
    private final DetalleSolicitudRepository detalleSolicitudRepository;
    private final SolicitudRepository solicitudRepository;
    private final UbicacionAreaRepository ubicacionAreaRepository;

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
                List<VendedorVarianteCoincidenciaDTO> parciales = filasVariante.stream()
                        .map(this::mapearCoincidenciaVariante)
                        .toList();
                List<Long> idsMultiple = parciales.stream()
                        .map(VendedorVarianteCoincidenciaDTO::idProductoVariante).toList();
                Map<Long, Integer> stockBulk = inventarioService.stockEnAlmacenBulk(idsMultiple);
                List<VendedorVarianteCoincidenciaDTO> opciones = parciales.stream()
                        .map(dto -> new VendedorVarianteCoincidenciaDTO(
                                dto.idProductoVariante(), dto.idProducto(),
                                dto.nombreProducto(), dto.talla(), dto.color(),
                                dto.sku(), dto.codigoBarras(), dto.precioUnitario(),
                                stockBulk.getOrDefault(dto.idProductoVariante(), 0)))
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

    /**
     * Construye el catálogo de variantes para el vendedor.
     * <p>
     * <b>Sin N+1:</b> en lugar de hacer 2 queries por variante, se cargan todos los
     * {@code Inventario} del producto en <em>una sola query</em> y se
     * agrupan en memoria por id de variante.
     * </p>
     * Total de queries: 1 (variantes) + 1 (inventarios bulk) + 1 (ubicación Almacén).
     */
    private VendedorCatalogoPorCodigoDTO construirCatalogo(Producto producto, Long idVariantePreseleccionada) {
        Long idProducto = producto.getIdProducto();
        List<ProductoVariante> variantes = productoVarianteService.obtenerVariantesPorProducto(idProducto, null);
        if (variantes.isEmpty()) {
            VendedorProductoResumenDTO resumen = new VendedorProductoResumenDTO(
                    idProducto, producto.getNombre(), producto.getPrecioUnitario(), 0);
            return new VendedorCatalogoPorCodigoDTO(resumen, idVariantePreseleccionada, List.of());
        }

        // --- 1 query bulk: todos los inventarios del producto ---
        List<Long> idsVariante = variantes.stream()
                .map(ProductoVariante::getIdProductoVariante).toList();
        List<Inventario> inventarios = inventarioRepository.findAllByVariantesIds(idsVariante);

        Map<Long, List<Inventario>> porVariante = inventarios.stream()
                .collect(Collectors.groupingBy(i -> i.getVariante().getIdProductoVariante()));

        Map<Long, UbicacionArea> destinoPorVariante = new LinkedHashMap<>();
        Map<Long, Integer> stockFisicoPorVariante = new LinkedHashMap<>();
        for (ProductoVariante pv : variantes) {
            Long idPV = pv.getIdProductoVariante();
            List<Inventario> invPV = porVariante.getOrDefault(idPV, List.of());
            List<Inventario> noAlmacen = invPV.stream()
                    .filter(i -> i.getUbicacionArea() != null
                            && !inventarioService.esUbicacionAlmacen(i.getUbicacionArea()))
                    .toList();
            if (noAlmacen.size() == 1) {
                destinoPorVariante.put(idPV, noAlmacen.get(0).getUbicacionArea());
            }
            int stockAlmacenVariante = invPV.stream()
                    .filter(i -> i.getUbicacionArea() != null
                            && inventarioService.esUbicacionAlmacen(i.getUbicacionArea()))
                    .mapToInt(i -> i.getStock() != null ? i.getStock() : 0)
                    .sum();
            stockFisicoPorVariante.put(idPV, stockAlmacenVariante);
        }

        Map<Long, Integer> reservadoPorVariante = cargarReservadoPorVariante(idsVariante, destinoPorVariante);

        List<VendedorVarianteStockDTO> filas = new ArrayList<>();
        for (ProductoVariante pv : variantes) {
            Long idPV = pv.getIdProductoVariante();
            int stockAlmacen = stockFisicoPorVariante.getOrDefault(idPV, 0);
            int stockReservado = reservadoPorVariante.getOrDefault(idPV, 0);
            int stockDisponible = Math.max(0, stockAlmacen - stockReservado);

            Long idUbicacionAreaDestino = null;
            String nombreUbicacion = null;
            UbicacionArea destino = destinoPorVariante.get(idPV);
            if (destino != null) {
                idUbicacionAreaDestino = destino.getIdUbicacionArea();
                nombreUbicacion = InventarioService.etiquetaUbicacionArea(destino);
                if (destino.getArea() != null && destino.getArea().getIdArea() != null) {
                    stockAlmacen = inventarioService.stockEnAlmacenDeLinea(idPV, destino);
                    stockReservado = reservadoPorVariante.getOrDefault(idPV, 0);
                    stockDisponible = Math.max(0, stockAlmacen - stockReservado);
                }
            }

            filas.add(new VendedorVarianteStockDTO(
                    idPV,
                    pv.getTalla(),
                    pv.getColor(),
                    pv.getCodigoBarras(),
                    stockAlmacen,
                    stockReservado,
                    stockDisponible,
                    idUbicacionAreaDestino,
                    nombreUbicacion));
        }

        int stockTotal = filas.stream().mapToInt(VendedorVarianteStockDTO::stockDisponible).sum();
        VendedorProductoResumenDTO resumen = new VendedorProductoResumenDTO(
                idProducto, producto.getNombre(), producto.getPrecioUnitario(), stockTotal);
        return new VendedorCatalogoPorCodigoDTO(resumen, idVariantePreseleccionada, filas);
    }

    private Map<Long, Integer> cargarReservadoPorVariante(
            List<Long> idsVariante, Map<Long, UbicacionArea> destinoPorVariante) {
        Map<Long, Integer> reservado = new LinkedHashMap<>();
        if (idsVariante.isEmpty()) {
            return reservado;
        }
        Map<Long, List<Long>> variantesPorArea = new LinkedHashMap<>();
        List<Long> sinDestino = new ArrayList<>();
        for (Long idVariante : idsVariante) {
            UbicacionArea destino = destinoPorVariante.get(idVariante);
            if (destino != null && destino.getArea() != null && destino.getArea().getIdArea() != null) {
                Long idArea = destino.getArea().getIdArea();
                variantesPorArea.computeIfAbsent(idArea, k -> new ArrayList<>()).add(idVariante);
            } else {
                sinDestino.add(idVariante);
            }
        }
        for (Map.Entry<Long, List<Long>> entry : variantesPorArea.entrySet()) {
            for (Object[] row : detalleSolicitudRepository.sumReservadoPendienteVentaPorVariantesEnLinea(
                    entry.getValue(), entry.getKey())) {
                reservado.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
            }
        }
        if (!sinDestino.isEmpty()) {
            for (Object[] row : detalleSolicitudRepository.sumReservadoPendienteVentaPorVariantesTotal(sinDestino)) {
                reservado.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
            }
        }
        return reservado;
    }

    @Transactional
    public Solicitud crearSolicitud(VendedorCrearSolicitudRequest req, Long idUsuario) {
        if (req.idVariante() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La variante es obligatoria");
        }
        if (req.cantidad() == null || req.cantidad() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero");
        }

        TipoSolicitud tipo = TipoSolicitud.VENTA;
        if (req.tipoSolicitud() != null && !req.tipoSolicitud().isBlank()) {
            try {
                tipo = TipoSolicitud.valueOf(req.tipoSolicitud().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "tipoSolicitud debe ser VENTA o REPOSICION");
            }
        }

        // Resolver ubicación destino: primero usar la indicada por el vendedor,
        // luego intentar inferirla desde el inventario existente.
        UbicacionArea destino;
        if (req.idUbicacionAreaDestino() != null) {
            destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(req.idUbicacionAreaDestino())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "El área destino seleccionada no existe"));
            if (inventarioService.esUbicacionAlmacen(destino)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "El área destino no puede ser un sector de Almacen");
            }
            inventarioService.obtenerOCrearFila(
                    productoVarianteService.obtenerVariantePorId(req.idVariante())
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND, "Variante no encontrada")),
                    destino);
        } else {
            try {
                destino = inventarioService.ubicacionAreaDeVarianteOLanzar(req.idVariante());
            } catch (IllegalStateException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Selecciona el área destino donde se enviará el producto.");
            }
        }
        destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(destino.getIdUbicacionArea())
                .orElse(destino);

        if (tipo == TipoSolicitud.VENTA) {
            inventarioService.validarDisponibleParaSolicitudVenta(req.idVariante(), req.cantidad(), destino);
        } else {
            int stockLinea = inventarioService.stockEnAlmacenDeLinea(req.idVariante(), destino);
            if (req.cantidad() > stockLinea) {
                String linea = destino.getArea() != null ? destino.getArea().getNombre() : "la línea";
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La cantidad supera el stock en Almacén · " + linea + " (" + stockLinea + ")");
            }
        }

        UbicacionArea origenAlmacen = inventarioService.resolverOrigenAlmacenConStock(
                req.idVariante(), req.cantidad(), destino);

        CrearSolicitudDTO dto = new CrearSolicitudDTO(
                tipo.name(),
                origenAlmacen.getIdUbicacionArea(),
                destino.getIdUbicacionArea(),
                List.of(new DetalleSolicitudLineaDTO(req.idVariante(), req.cantidad())),
                req.codigoLote());

        return solicitudService.crear(dto, idUsuario);
    }

    /**
     * Crea una o más solicitudes agrupando ítems por área destino (una solicitud por destino,
     * con varias líneas de detalle). Un solo {@code codigoLote} para todo el envío.
     */
    @Transactional
    public CrearSolicitudLoteResult crearSolicitudLote(VendedorCrearSolicitudLoteRequest req, Long idUsuario) {
        if (req.items() == null || req.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La lista de ítems no puede estar vacía");
        }
        String codigoLote = req.codigoLote();
        if (codigoLote == null || codigoLote.isBlank()) {
            codigoLote = "LOT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        Map<Long, Map<Long, Integer>> porDestino = new LinkedHashMap<>();
        for (VendedorCrearSolicitudLoteRequest.VendedorCrearSolicitudLoteItem item : req.items()) {
            if (item.idVariante() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La variante es obligatoria");
            }
            if (item.cantidad() == null || item.cantidad() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero");
            }
            if (item.idUbicacionAreaDestino() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cada ítem debe indicar el área destino (idUbicacionAreaDestino)");
            }
            porDestino
                    .computeIfAbsent(item.idUbicacionAreaDestino(), k -> new LinkedHashMap<>())
                    .merge(item.idVariante(), item.cantidad(), Integer::sum);
        }

        List<Long> idsCreados = new ArrayList<>();
        for (Map.Entry<Long, Map<Long, Integer>> entry : porDestino.entrySet()) {
            Long idDestino = entry.getKey();
            UbicacionArea destino = ubicacionAreaRepository.findByIdWithUbicacionYArea(idDestino)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "El área destino seleccionada no existe: " + idDestino));
            if (inventarioService.esUbicacionAlmacen(destino)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El área destino no puede ser un sector de Almacen");
            }

            for (Map.Entry<Long, Integer> linea : entry.getValue().entrySet()) {
                inventarioService.validarDisponibleParaSolicitudVenta(
                        linea.getKey(), linea.getValue(), destino);
            }

            List<DetalleSolicitudLineaDTO> lineas = new ArrayList<>();
            int cantidadMaximaItem = 0;
            Long idVarianteMayorCantidad = null;
            for (Map.Entry<Long, Integer> linea : entry.getValue().entrySet()) {
                ProductoVariante variante = productoVarianteService.obtenerVariantePorId(linea.getKey())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Variante no encontrada: " + linea.getKey()));
                if (linea.getValue() > cantidadMaximaItem) {
                    cantidadMaximaItem = linea.getValue();
                    idVarianteMayorCantidad = linea.getKey();
                }
                inventarioService.obtenerOCrearFila(variante, destino);
                lineas.add(new DetalleSolicitudLineaDTO(linea.getKey(), linea.getValue()));
            }

            if (idVarianteMayorCantidad == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solicitud sin variantes");
            }
            UbicacionArea origenAlmacen = inventarioService.resolverOrigenAlmacenConStock(
                    idVarianteMayorCantidad, Math.max(1, cantidadMaximaItem), destino);

            CrearSolicitudDTO dto = new CrearSolicitudDTO(
                    TipoSolicitud.VENTA.name(),
                    origenAlmacen.getIdUbicacionArea(),
                    destino.getIdUbicacionArea(),
                    lineas,
                    codigoLote);
            idsCreados.add(solicitudService.crear(dto, idUsuario).getIdSolicitud());
        }

        return new CrearSolicitudLoteResult(codigoLote, idsCreados);
    }

    /**
     * Retorna todas las ubicaciones disponibles como destino para el vendedor.
     * Excluye las ubicaciones reservadas (Almacén, Bodega, Depósito y variantes ortográficas).
     */
    @Transactional(readOnly = true)
    public List<VendedorUbicacionDTO> listarUbicacionesPiso() {
        return ubicacionAreaRepository.findAll().stream()
                .filter(ua -> !inventarioService.esUbicacionAlmacen(ua))
                .sorted((a, b) -> {
                    String na = a.getUbicacion() != null ? a.getUbicacion().getNombre() : "";
                    String nb = b.getUbicacion() != null ? b.getUbicacion().getNombre() : "";
                    int cmp = na.compareToIgnoreCase(nb);
                    if (cmp != 0) {
                        return cmp;
                    }
                    String aa = a.getArea() != null ? a.getArea().getNombre() : "";
                    String bb = b.getArea() != null ? b.getArea().getNombre() : "";
                    return aa.compareToIgnoreCase(bb);
                })
                .map(ua -> new VendedorUbicacionDTO(
                        ua.getIdUbicacionArea(),
                        ua.getUbicacion() != null ? ua.getUbicacion().getNombre() : null,
                        ua.getArea() != null ? ua.getArea().getNombre() : null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VendedorSolicitudResumenDTO> listarMisSolicitudes(Long idUsuario, Instant desde, Instant hasta) {
        List<Solicitud> solicitudes = solicitudRepository
                .findMisSolicitudesConDetalles(idUsuario, desde, hasta);

        List<VendedorSolicitudResumenDTO> resultado = new ArrayList<>();
        for (Solicitud s : solicitudes) {
            List<DetalleSolicitud> detalles = s.getDetalles();
            if (detalles == null || detalles.isEmpty()) {
                continue;
            }
            for (DetalleSolicitud d : detalles) {
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
        }
        return resultado;
    }

    @Transactional
    public void cancelarMiSolicitudPendiente(Long idSolicitud, Long idUsuario) {
        Solicitud s = solicitudRepository.findByIdWithUsuario(idSolicitud)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (s.getUsuario() == null || s.getUsuario().getId() == null || !s.getUsuario().getId().equals(idUsuario)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes cancelar esta solicitud");
        }
        if (s.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se pueden cancelar solicitudes pendientes");
        }
        s.setEstado(EstadoSolicitud.CANCELADO);
        s.setMotivoRechazo(null);
        solicitudRepository.save(s);
        solicitudRepository.flush();
    }
}
