package com.tienda.ropa.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventarioService {

    public static final String UBICACION_ALMACEN_NOMBRE = "Almacen";

    private static final String[] NOMBRES_ALMACEN_CANDIDATOS = {
            "Almacen", "Almacén", "ALMACEN", "Bodega", "Depósito", "Deposito"
    };

    private static final List<String> NOMBRES_ALMACEN_LOWER = List.of(
            "almacén", "almacen", "bodega", "depósito", "deposito");

    public static List<String> nombresAlmacenLower() {
        return NOMBRES_ALMACEN_LOWER;
    }

    private final InventarioRepository inventarioRepository;
    private final UbicacionAreaRepository ubicacionAreaRepository;
    private final ProductoVarianteRepository productoVarianteRepository;
    private final DetalleSolicitudRepository detalleSolicitudRepository;

    public static String etiquetaUbicacionArea(UbicacionArea ua) {
        if (ua == null || ua.getUbicacion() == null) {
            return "(sin ubicación)";
        }
        String piso = ua.getUbicacion().getNombre();
        if (ua.getArea() != null && ua.getArea().getNombre() != null && !ua.getArea().getNombre().isBlank()) {
            return piso + " / " + ua.getArea().getNombre();
        }
        return piso;
    }

    @Transactional(readOnly = true)
    public List<UbicacionArea> listarUbicacionesAreaAlmacen() {
        return ubicacionAreaRepository.findAreasAlmacen(NOMBRES_ALMACEN_LOWER);
    }

    /**
     * Referencia legacy a un par Almacen + área (primera fila del catálogo).
     * Preferir {@link #listarUbicacionesAreaAlmacen()} o {@link #resolverOrigenAlmacenConStock}.
     */
    @Transactional(readOnly = true)
    public UbicacionArea ubicacionAreaAlmacen() {
        List<UbicacionArea> candidatas = listarUbicacionesAreaAlmacen();
        if (!candidatas.isEmpty()) {
            return candidatas.get(0);
        }
        throw new IllegalStateException(
                "No existe ubicación-área de Almacen; ejecute las migraciones Flyway o cree los pares en BD.");
    }

    /**
     * Origen de solicitud desde almacén: prioriza el sector con stock suficiente; si no hay, el de mayor stock.
     * @deprecated Preferir {@link #resolverOrigenAlmacenConStock(Long, int, UbicacionArea)} alineado al destino.
     */
    @Deprecated
    @Transactional(readOnly = true)
    public UbicacionArea resolverOrigenAlmacenConStock(Long idVariante, int cantidadMinima) {
        List<UbicacionArea> areas = listarUbicacionesAreaAlmacen();
        if (areas.isEmpty()) {
            throw new IllegalStateException("No hay sectores de Almacen configurados.");
        }
        UbicacionArea conMayorStock = areas.get(0);
        int mayor = -1;
        for (UbicacionArea ua : areas) {
            int stock = stockEnUbicacionArea(idVariante, ua.getIdUbicacionArea());
            if (cantidadMinima > 0 && stock >= cantidadMinima) {
                return ua;
            }
            if (stock > mayor) {
                mayor = stock;
                conMayorStock = ua;
            }
        }
        return conMayorStock;
    }

    /**
     * Origen en almacén de la misma línea que el destino (mismo id_area del catálogo).
     */
    @Transactional(readOnly = true)
    public UbicacionArea resolverOrigenAlmacenConStock(Long idVariante, int cantidadMinima, UbicacionArea destino) {
        if (destino == null || destino.getArea() == null || destino.getArea().getIdArea() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El área destino no tiene línea de catálogo válida.");
        }
        Long idAreaCatalogo = destino.getArea().getIdArea();
        String nombreLinea = destino.getArea().getNombre();
        List<UbicacionArea> candidatas = listarUbicacionesAreaAlmacen().stream()
                .filter(ua -> ua.getArea() != null && idAreaCatalogo.equals(ua.getArea().getIdArea()))
                .toList();
        if (candidatas.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No hay sector de Almacén configurado para la línea " + nombreLinea + ".");
        }
        UbicacionArea conMayorStock = candidatas.get(0);
        int mayor = -1;
        for (UbicacionArea ua : candidatas) {
            int stock = stockEnUbicacionArea(idVariante, ua.getIdUbicacionArea());
            if (cantidadMinima > 0 && stock >= cantidadMinima) {
                return ua;
            }
            if (stock > mayor) {
                mayor = stock;
                conMayorStock = ua;
            }
        }
        if (cantidadMinima > 0 && mayor < cantidadMinima) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No hay stock suficiente en Almacén · " + nombreLinea
                            + " (disponible: " + Math.max(0, mayor) + ", solicitado: " + cantidadMinima + ").");
        }
        return conMayorStock;
    }

    /** Stock en sectores de almacén de la misma línea que el destino. */
    @Transactional(readOnly = true)
    public int stockEnAlmacenDeLinea(Long idVariante, UbicacionArea destino) {
        if (destino == null || destino.getArea() == null || destino.getArea().getIdArea() == null) {
            return 0;
        }
        Long idAreaCatalogo = destino.getArea().getIdArea();
        return listarUbicacionesAreaAlmacen().stream()
                .filter(ua -> ua.getArea() != null && idAreaCatalogo.equals(ua.getArea().getIdArea()))
                .mapToInt(ua -> stockEnUbicacionArea(idVariante, ua.getIdUbicacionArea()))
                .sum();
    }

    @Transactional(readOnly = true)
    public int cantidadReservadaPendienteVentaEnLinea(Long idVariante, UbicacionArea destino) {
        if (destino == null || destino.getArea() == null || destino.getArea().getIdArea() == null) {
            return 0;
        }
        return detalleSolicitudRepository.sumCantidadReservadaPendienteVentaEnLinea(
                idVariante, destino.getArea().getIdArea());
    }

    @Transactional(readOnly = true)
    public int cantidadReservadaPendienteVentaTotal(Long idVariante) {
        return detalleSolicitudRepository.sumCantidadReservadaPendienteVentaTotal(idVariante);
    }

    @Transactional(readOnly = true)
    public int stockDisponibleEnAlmacenDeLinea(Long idVariante, UbicacionArea destino) {
        int fisico = stockEnAlmacenDeLinea(idVariante, destino);
        int reservado = cantidadReservadaPendienteVentaEnLinea(idVariante, destino);
        return Math.max(0, fisico - reservado);
    }

    /**
     * Bloquea filas de inventario en almacén (misma línea que destino) para serializar reservas concurrentes.
     */
    @Transactional
    public void bloquearFilasAlmacenLinea(Long idVariante, UbicacionArea destino) {
        if (destino == null || destino.getArea() == null || destino.getArea().getIdArea() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "El área destino no tiene línea de catálogo válida.");
        }
        inventarioRepository.findFilasAlmacenLineaForUpdate(
                idVariante, destino.getArea().getIdArea(), NOMBRES_ALMACEN_LOWER);
    }

    /**
     * Valida que la cantidad solicitada no supere el stock disponible (físico − reservas blandas).
     */
    @Transactional
    public void validarDisponibleParaSolicitudVenta(Long idVariante, int cantidadSolicitada, UbicacionArea destino) {
        if (cantidadSolicitada <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a cero");
        }
        bloquearFilasAlmacenLinea(idVariante, destino);
        int fisico = stockEnAlmacenDeLinea(idVariante, destino);
        int reservado = cantidadReservadaPendienteVentaEnLinea(idVariante, destino);
        int disponible = Math.max(0, fisico - reservado);
        if (cantidadSolicitada > disponible) {
            String linea = destino.getArea() != null ? destino.getArea().getNombre() : "la línea";
            String mensaje = construirMensajeStockInsuficienteVenta(
                    idVariante, destino, linea, disponible, fisico, reservado);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
        }
    }

    private String construirMensajeStockInsuficienteVenta(
            Long idVariante,
            UbicacionArea destino,
            String linea,
            int disponible,
            int fisico,
            int reservado) {
        String base = "La cantidad supera el stock disponible en Almacén · " + linea
                + " (disponible: " + disponible
                + ", físico: " + fisico
                + ", reservado en pedidos: " + reservado + ").";

        if (fisico > 0 || reservado > 0) {
            if (reservado > 0 && disponible == 0) {
                return base + " Hay otras solicitudes pendientes ocupando el stock; espera a que las atiendan o rechacen.";
            }
            return base;
        }

        int enPisoDestino = destino.getIdUbicacionArea() != null
                ? stockEnUbicacionArea(idVariante, destino.getIdUbicacionArea())
                : 0;
        if (enPisoDestino > 0) {
            return base + " Hay " + enPisoDestino + " uds. en "
                    + etiquetaUbicacionArea(destino)
                    + " (posible despacho anterior). El almacén no tiene stock para un nuevo pedido: repón en Inventario o traslada desde el piso.";
        }

        return base + " No hay unidades en almacén para esta línea. Si rechazaste un pedido pendiente, la reserva ya se liberó; registra stock en Inventario.";
    }

    public boolean esUbicacionAlmacen(UbicacionArea ua) {
        if (ua == null || ua.getUbicacion() == null) {
            return false;
        }
        String nombre = ua.getUbicacion().getNombre();
        if (nombre == null) {
            return false;
        }
        return NOMBRES_ALMACEN_LOWER.contains(nombre.trim().toLowerCase());
    }

    @Transactional(readOnly = true)
    public UbicacionArea resolverUbicacionAreaUnicaDeVenta(Long idVariante) {
        List<Inventario> filas = inventarioRepository.findConStockPositivoExcluyendoAlmacen(
                idVariante, NOMBRES_ALMACEN_LOWER);
        if (filas.isEmpty()) {
            throw new IllegalStateException(
                    "No existe stock vendible para la variante " + idVariante
                            + " (solo hay stock en Almacén o es 0).");
        }
        if (filas.size() > 1) {
            String ubicaciones = filas.stream()
                    .map(f -> etiquetaUbicacionArea(f.getUbicacionArea()))
                    .distinct()
                    .limit(5)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("(múltiples)");
            throw new IllegalStateException(
                    "La variante " + idVariante + " tiene stock en múltiples áreas: " + ubicaciones);
        }
        return filas.get(0).getUbicacionArea();
    }

    @Transactional
    public Inventario obtenerOCrearFila(ProductoVariante variante, UbicacionArea ubicacionArea) {
        return inventarioRepository.findByVarianteAndUbicacionArea(variante, ubicacionArea)
                .orElseGet(() -> {
                    Inventario row = new Inventario();
                    row.setVariante(variante);
                    row.setUbicacionArea(ubicacionArea);
                    row.setStock(0);
                    row.setStockMinimo(0);
                    row.setStockMaximo(null);
                    return inventarioRepository.save(row);
                });
    }

    @Transactional
    public Inventario obtenerOCrearFilaAlmacen(ProductoVariante variante) {
        return obtenerOCrearFila(variante, ubicacionAreaAlmacen());
    }

    @Transactional
    public void asegurarFilaAlmacenConStock(ProductoVariante variante, int stockInicial) {
        Inventario row = obtenerOCrearFilaAlmacen(variante);
        if (row.getStock() == null || row.getStock() == 0) {
            row.setStock(Math.max(0, stockInicial));
            inventarioRepository.save(row);
        }
        sincronizarCantidadVariante(variante.getIdProductoVariante());
    }

    @Transactional
    public void establecerStockAlmacen(Long idVariante, int stockAbsoluto) {
        establecerStockEnUbicacionArea(idVariante, ubicacionAreaAlmacen(), stockAbsoluto);
    }

    @Transactional
    public void establecerStockEnUbicacionArea(Long idVariante, UbicacionArea ubicacionArea, int stockAbsoluto) {
        ProductoVariante v = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
        Inventario row = obtenerOCrearFila(v, ubicacionArea);
        row.setStock(Math.max(0, stockAbsoluto));
        inventarioRepository.save(row);
        sincronizarCantidadVariante(idVariante);
    }

    @Transactional(readOnly = true)
    public UbicacionArea ubicacionAreaDeVarianteOLanzar(Long idVariante) {
        List<Inventario> filas = inventarioRepository.findByVariante_IdProductoVariante(idVariante);
        UbicacionArea almacen = ubicacionAreaAlmacen();
        UbicacionArea encontrada = null;
        for (Inventario f : filas) {
            if (f.getUbicacionArea() == null) {
                continue;
            }
            if (f.getUbicacionArea().getIdUbicacionArea().equals(almacen.getIdUbicacionArea())) {
                continue;
            }
            if (encontrada != null) {
                throw new IllegalStateException(
                        "La variante " + idVariante + " tiene registro en múltiples áreas: "
                                + etiquetaUbicacionArea(encontrada) + " y "
                                + etiquetaUbicacionArea(f.getUbicacionArea()));
            }
            encontrada = f.getUbicacionArea();
        }
        if (encontrada == null) {
            throw new IllegalStateException(
                    "La variante " + idVariante + " no tiene un área asignada fuera de Almacén");
        }
        return encontrada;
    }

    @Transactional
    public void aplicarDeltaEnUbicacionArea(
            Long idVariante, UbicacionArea ubicacionArea, int delta, String mensajeStockInsuficiente) {
        ProductoVariante v = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
        Inventario row = obtenerOCrearFila(v, ubicacionArea);
        int actual = row.getStock() != null ? row.getStock() : 0;
        int nuevo = actual + delta;
        if (nuevo < 0) {
            throw new IllegalArgumentException(mensajeStockInsuficiente);
        }
        row.setStock(nuevo);
        inventarioRepository.save(row);
        sincronizarCantidadVariante(idVariante);
    }

    @Transactional
    public void sincronizarCantidadVariante(Long idVariante) {
        int suma = inventarioRepository.sumStockByVariante(idVariante);
        ProductoVariante v = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
        v.setCantidad(suma);
        productoVarianteRepository.save(v);
    }

    public int stockTotalVariante(Long idVariante) {
        return inventarioRepository.sumStockByVariante(idVariante);
    }

    @Transactional(readOnly = true)
    public int stockEnAlmacen(Long idVariante) {
        return inventarioRepository.sumStockByVarianteEnAlmacen(idVariante, NOMBRES_ALMACEN_LOWER);
    }

    @Transactional(readOnly = true)
    public int stockEnUbicacionArea(Long idVariante, Long idUbicacionArea) {
        if (idUbicacionArea == null) {
            return 0;
        }
        return inventarioRepository
                .findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                        idVariante, idUbicacionArea)
                .map(i -> i.getStock() != null ? i.getStock() : 0)
                .orElse(0);
    }

    @Transactional
    public void asegurarFilaConStock(ProductoVariante variante, UbicacionArea ubicacionArea, int stockInicial) {
        Inventario row = obtenerOCrearFila(variante, ubicacionArea);
        if (row.getStock() == null || row.getStock() == 0) {
            row.setStock(Math.max(0, stockInicial));
            inventarioRepository.save(row);
        }
        sincronizarCantidadVariante(variante.getIdProductoVariante());
    }
}
