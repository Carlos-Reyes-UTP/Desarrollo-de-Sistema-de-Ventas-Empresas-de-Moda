package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.InventarioUbicacion;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.repository.InventarioUbicacionRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.UbicacionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventarioUbicacionService {

    public static final String UBICACION_PRINCIPAL_NOMBRE = "Principal";
    public static final String UBICACION_ALMACEN_NOMBRE = "Almacén";

    /**
     * Variantes ortográficas aceptadas para resolver la ubicación Almacén
     * (alineadas con {@code ReposicionAutomaticaService} y la migración V9).
     */
    private static final String[] NOMBRES_ALMACEN_CANDIDATOS = {
            "Almacén", "Almacen", "ALMACEN", "Bodega", "Depósito", "Deposito"
    };

    private final InventarioUbicacionRepository inventarioUbicacionRepository;
    private final UbicacionRepository ubicacionRepository;
    private final ProductoVarianteRepository productoVarianteRepository;

    public Ubicacion ubicacionPrincipal() {
        return ubicacionRepository.findByNombreIgnoreCase(UBICACION_PRINCIPAL_NOMBRE)
                .orElseThrow(() -> new IllegalStateException("No existe la ubicación '" + UBICACION_PRINCIPAL_NOMBRE + "'"));
    }

    public Ubicacion ubicacionAlmacen() {
        for (String nombre : NOMBRES_ALMACEN_CANDIDATOS) {
            Optional<Ubicacion> u = ubicacionRepository.findByNombreIgnoreCase(nombre);
            if (u.isPresent()) {
                return u.get();
            }
        }
        throw new IllegalStateException(
                "No existe la ubicación 'Almacén'; ejecute la migración V9 o créela manualmente.");
    }

    /**
     * Resuelve la ubicación "real" de una variante para salida por venta, asumiendo la regla de negocio:
     * una variante no puede existir en más de un área (excluyendo Almacén).
     *
     * @throws IllegalStateException si no hay stock vendible en ninguna ubicación o si hay más de una ubicación.
     */
    @Transactional(readOnly = true)
    public Ubicacion resolverUbicacionUnicaDeVenta(Long idVariante) {
    List<InventarioUbicacion> filas = inventarioUbicacionRepository
        .findConStockPositivoExcluyendoUbicacion(idVariante, UBICACION_ALMACEN_NOMBRE);
    if (filas.isEmpty()) {
        throw new IllegalStateException(
            "No existe stock vendible para la variante " + idVariante + " (solo hay stock en 'Almacén' o es 0)."
        );
    }
    if (filas.size() > 1) {
        String ubicaciones = filas.stream()
            .map(f -> f.getUbicacion() != null ? f.getUbicacion().getNombre() : "(sin ubicación)")
            .distinct()
            .limit(5)
            .reduce((a, b) -> a + ", " + b)
            .orElse("(múltiples)");
        throw new IllegalStateException(
            "La variante " + idVariante + " tiene stock en múltiples áreas: " + ubicaciones
                + ". Esto contradice la regla de unicidad por área."
        );
    }
    return filas.get(0).getUbicacion();
    }

    @Transactional
    public InventarioUbicacion obtenerOCrearFila(ProductoVariante variante, Ubicacion ubicacion) {
        return inventarioUbicacionRepository.findByVarianteAndUbicacion(variante, ubicacion)
                .orElseGet(() -> {
                    InventarioUbicacion row = new InventarioUbicacion();
                    row.setVariante(variante);
                    row.setUbicacion(ubicacion);
                    row.setStockActual(0);
                    row.setStockMinimo(0);
                    row.setStockMaximo(null);
                    return inventarioUbicacionRepository.save(row);
                });
    }

    @Transactional
    public InventarioUbicacion obtenerOCrearFilaPrincipal(ProductoVariante variante) {
        return obtenerOCrearFila(variante, ubicacionPrincipal());
    }

    @Transactional
    public InventarioUbicacion obtenerOCrearFilaAlmacen(ProductoVariante variante) {
        return obtenerOCrearFila(variante, ubicacionAlmacen());
    }

    /**
     * Garantiza fila en Principal y asigna {@code stockInicial} solo si estaba en cero.
     * Mantiene compatibilidad con código previo (no se usa para nuevas variantes,
     * que ahora reciben stock inicial en Almacén).
     */
    @Transactional
    public void asegurarFilaPrincipalConStock(ProductoVariante variante, int stockInicial) {
        InventarioUbicacion row = obtenerOCrearFilaPrincipal(variante);
        if (row.getStockActual() == null || row.getStockActual() == 0) {
            row.setStockActual(Math.max(0, stockInicial));
            inventarioUbicacionRepository.save(row);
        }
        sincronizarCantidadVariante(variante.getIdProductoVariante());
    }

    /**
     * Stock inicial al crear una variante o al editar masivamente: se acumula
     * directamente en Almacén. Si la fila ya tiene stock se respeta y solo se
     * sincroniza la cantidad total de la variante.
     */
    @Transactional
    public void asegurarFilaAlmacenConStock(ProductoVariante variante, int stockInicial) {
        InventarioUbicacion row = obtenerOCrearFilaAlmacen(variante);
        if (row.getStockActual() == null || row.getStockActual() == 0) {
            row.setStockActual(Math.max(0, stockInicial));
            inventarioUbicacionRepository.save(row);
        }
        sincronizarCantidadVariante(variante.getIdProductoVariante());
    }

    @Transactional
    public void establecerStockPrincipal(Long idVariante, int stockAbsoluto) {
        establecerStockEnUbicacion(idVariante, ubicacionPrincipal(), stockAbsoluto);
    }

    /**
     * Fija el stock absoluto de una variante en Almacén (usado al editar la
     * cantidad de una variante existente desde el flujo de almacenero).
     */
    @Transactional
    public void establecerStockAlmacen(Long idVariante, int stockAbsoluto) {
        establecerStockEnUbicacion(idVariante, ubicacionAlmacen(), stockAbsoluto);
    }

    @Transactional
    public void establecerStockEnUbicacion(Long idVariante, Ubicacion ubicacion, int stockAbsoluto) {
        ProductoVariante v = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
        InventarioUbicacion row = obtenerOCrearFila(v, ubicacion);
        row.setStockActual(Math.max(0, stockAbsoluto));
        inventarioUbicacionRepository.save(row);
        sincronizarCantidadVariante(idVariante);
    }

    @Transactional
    public void aplicarDeltaStockPrincipal(Long idVariante, int delta) {
        aplicarDeltaEnUbicacion(idVariante, ubicacionPrincipal(), delta,
                "Stock insuficiente en ubicación principal");
    }

    /**
     * Aplica un delta sobre la fila ({@code variante}, {@code ubicacion}). Lanza
     * {@link IllegalArgumentException} si el delta dejaría el stock negativo.
     */
    @Transactional
    public void aplicarDeltaEnUbicacion(Long idVariante, Ubicacion ubicacion, int delta, String mensajeStockInsuficiente) {
    ProductoVariante v = productoVarianteRepository.findById(idVariante)
        .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
    InventarioUbicacion row = obtenerOCrearFila(v, ubicacion);
    int actual = row.getStockActual() != null ? row.getStockActual() : 0;
    int nuevo = actual + delta;
    System.out.println("[DEBUG] aplicarDeltaEnUbicacion: Variante=" + idVariante + ", Ubicacion=" + (ubicacion != null ? ubicacion.getNombre() : "null") + ", StockActual=" + actual + ", Delta=" + delta + ", NuevoStock=" + nuevo);
    if (nuevo < 0) {
        System.out.println("[ERROR] Stock insuficiente: Variante=" + idVariante + ", Ubicacion=" + (ubicacion != null ? ubicacion.getNombre() : "null") + ", StockActual=" + actual + ", Delta=" + delta);
        throw new IllegalArgumentException(mensajeStockInsuficiente);
    }
    row.setStockActual(nuevo);
    inventarioUbicacionRepository.save(row);
    sincronizarCantidadVariante(idVariante);
    }

    @Transactional
    public void sincronizarCantidadVariante(Long idVariante) {
        int suma = inventarioUbicacionRepository.sumStockByVariante(idVariante);
        ProductoVariante v = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe variante: " + idVariante));
        v.setCantidad(suma);
        productoVarianteRepository.save(v);
    }

    public int stockTotalVariante(Long idVariante) {
        return inventarioUbicacionRepository.sumStockByVariante(idVariante);
    }

    /**
     * Stock físico solo en la ubicación Almacén (no incluye Principal ni otros pisos).
     */
    @Transactional(readOnly = true)
    public int stockEnAlmacen(Long idVariante) {
        Ubicacion almacen = ubicacionAlmacen();
        return inventarioUbicacionRepository
                .findByVariante_IdProductoVarianteAndUbicacion_IdUbicacion(idVariante, almacen.getIdUbicacion())
                .map(iu -> iu.getStockActual() != null ? iu.getStockActual() : 0)
                .orElse(0);
    }
}
