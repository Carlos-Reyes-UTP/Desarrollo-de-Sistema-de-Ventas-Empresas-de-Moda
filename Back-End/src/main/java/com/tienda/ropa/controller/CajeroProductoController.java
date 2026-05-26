package com.tienda.ropa.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.OrigenVentaResult;
import com.tienda.ropa.entity.OrigenVenta;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.service.InventarioService;
import com.tienda.ropa.service.ProductoService;
import com.tienda.ropa.service.ProductoVarianteService;
import com.tienda.ropa.service.ReposicionAutomaticaService;

@RestController
@RequestMapping("/api/cajero/productos")
public class CajeroProductoController {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoVarianteService productoVarianteService;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private ReposicionAutomaticaService reposicionAutomaticaService;

    /**
     * @deprecated Usar {@code GET /variantes/pagina}. Solo ADMIN (ver seguridad).
     */
    @Deprecated
    @GetMapping("/variantes")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodasLasVariantes() {
        List<Object[]> resultados = productoVarianteService.obtenerTodasLasVariantesParaCajero();
        List<Map<String, Object>> variantes = resultados.stream().map(this::mapearResultadoAVariante).collect(Collectors.toList());
        return ResponseEntity.ok()
                .header("Deprecation", "true")
                .header("Link", "</api/cajero/productos/variantes/pagina>; rel=\"successor-version\"")
                .body(variantes);
    }

    // NUEVO: Variantes paginadas con búsqueda server-side
    @GetMapping("/variantes/pagina")
    public ResponseEntity<Map<String, Object>> obtenerVariantesPaginadas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) String busqueda) {
        int pagina = Math.max(page, 0);
        int tamanio = Math.max(1, Math.min(size, 100));
        String termino = busqueda == null ? null : busqueda.trim();
        if (termino != null && termino.isEmpty()) {
            termino = null;
        }

        org.springframework.data.domain.Page<Object[]> resultados = productoVarianteService
                .obtenerVariantesPaginadasParaCajero(termino, org.springframework.data.domain.PageRequest.of(pagina, tamanio));
        
        List<Map<String, Object>> variantes = resultados.getContent().stream()
                .map(this::mapearResultadoAVariante).collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", variantes);
        response.put("totalElements", resultados.getTotalElements());
        response.put("totalPages", resultados.getTotalPages());
        response.put("pageNumber", resultados.getNumber());
        response.put("pageSize", resultados.getSize());
        
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> mapearResultadoAVariante(Object[] resultado) {
        Map<String, Object> variante = new HashMap<>();
        variante.put("idProductoVariante", resultado[0]);
        variante.put("codigoBarras", resultado[1]);
        variante.put("codigoBarrasVariante", resultado[1]);
        variante.put("cantidad", resultado[2]);
        variante.put("sku", resultado[15]);
        variante.put("stockEnPiso", resultado.length > 16 ? resultado[16] : 0);

        Map<String, Object> producto = new HashMap<>();
        producto.put("idProducto", resultado[3]);
        producto.put("nombre", resultado[4]);
        producto.put("sexo", resultado[5]);
        producto.put("tipoPublico", resultado[6]);
        producto.put("codigoIdentificacion", resultado[7]);
        producto.put("precioUnitario", resultado[8]);
        variante.put("producto", producto);

        Map<String, Object> talla = new HashMap<>();
        talla.put("idTalla", resultado[9]);
        talla.put("nombreTalla", resultado[10]);
        variante.put("talla", talla);

        Map<String, Object> color = new HashMap<>();
        color.put("idColor", resultado[11]);
        color.put("nombre", resultado[12]);
        variante.put("color", color);

        Map<String, Object> categorias = new HashMap<>();
        categorias.put("categoria", resultado[13]);
        categorias.put("subCategoria2", resultado[14]);
        variante.put("categorias", categorias);

        return variante;
    }

    // Obtener variante específica por ID
    @GetMapping("/variantes/{id}")
    public ResponseEntity<ProductoVariante> obtenerVariantePorId(@PathVariable Long id) {
        Optional<ProductoVariante> variante = productoVarianteService.obtenerVariantePorId(id);
        return variante.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Obtener variantes de un producto específico
    @GetMapping("/variantes/producto/{idProducto}")
    public List<ProductoVariante> obtenerVariantesPorProducto(@PathVariable Long idProducto) {
        return productoVarianteService.obtenerVariantesPorProducto(idProducto, null);
    }

    // Actualizar cantidad de una variante (para ventas)
    @PatchMapping("/variantes/{id}/disminuir")
    public ResponseEntity<ProductoVariante> disminuirCantidadVariante(
            @PathVariable Long id,
            @RequestParam Integer cantidad) {

        Optional<ProductoVariante> varianteOpt = productoVarianteService.obtenerVariantePorId(id);

        if (!varianteOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        ProductoVariante variante = varianteOpt.get();
        int stock = inventarioService.stockTotalVariante(id);

        if (stock < cantidad) {
            return ResponseEntity.badRequest().build(); // No hay suficiente stock
        }

    OrigenVentaResult origenResult = inventarioService.resolverUbicacionAreaDeVentaConFallback(id, cantidad);
    UbicacionArea ubicacionAreaVenta = origenResult.ubicacionArea();
    inventarioService.aplicarDeltaEnUbicacionArea(
        id,
        ubicacionAreaVenta,
        -cantidad,
        "Stock insuficiente en la ubicación de venta: "
                + InventarioService.etiquetaUbicacionArea(ubicacionAreaVenta));
    if (origenResult.tipoOrigen() == OrigenVenta.PISO) {
        reposicionAutomaticaService.evaluarTrasSalidaEnUbicacionArea(
                id, ubicacionAreaVenta.getIdUbicacionArea());
    } else {
        reposicionAutomaticaService.evaluarTrasVentaDirectaDesdeAlmacen(
                id, ubicacionAreaVenta.getIdUbicacionArea());
    }
        ProductoVariante varianteActualizada = productoVarianteService.obtenerVariantePorId(id).orElse(variante);
        return ResponseEntity.ok(varianteActualizada);
    }

    // Obtener todos los productos (solo lectura)
    @GetMapping
    public List<Producto> obtenerTodosLosProductos() {
        return productoService.obtenerProductos();
    }

    // Obtener producto por ID (solo lectura)
    @GetMapping("/{id}")
    public Optional<Producto> obtenerProductoPorId(@PathVariable Long id) {
        return productoService.obtenerProductoPorId(id);
    }

    // Buscar productos por nombre (solo lectura)
    @GetMapping("/nombre/{nombre}")
    public List<Producto> obtenerProductosPorNombre(@PathVariable String nombre) {
        return productoService.obtenerProductosPorNombre(nombre);
    }

    // Buscar productos por código (solo lectura)
    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<List<Producto>> obtenerProductosPorCodigo(@PathVariable String codigo) {
        List<Producto> productos = productoService.obtenerProductosPorCodigo(codigo);
        if (productos.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(productos);
    }

    // Buscar productos por categoría (solo lectura)
    @GetMapping("/categoria/{categoria}")
    public List<Producto> obtenerProductosPorCategoria(@PathVariable String categoria) {
        return productoService.obtenerProductosPorCategoria(categoria);
    }

    // Actualizar solo la cantidad de un producto
    @PatchMapping("/{id}/cantidad")
    public ResponseEntity<Producto> actualizarCantidadProducto(
            @PathVariable Long id,
            @RequestParam Integer cantidad) {

        Optional<Producto> productoOpt = productoService.obtenerProductoPorId(id);

        if (!productoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Producto producto = productoOpt.get();
        producto.setCantidad(cantidad);

        Producto productoActualizado = productoService.editarProducto(id, producto);
        return ResponseEntity.ok(productoActualizado);
    }

    // Disminuir la cantidad de un producto (para ventas)
    @PatchMapping("/{id}/disminuir")
    public ResponseEntity<Producto> disminuirCantidadProducto(
            @PathVariable Long id,
            @RequestParam Integer cantidad) {

        Optional<Producto> productoOpt = productoService.obtenerProductoPorId(id);

        if (!productoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Producto producto = productoOpt.get();
        int nuevaCantidad = producto.getCantidad() - cantidad;

        if (nuevaCantidad < 0) {
            return ResponseEntity.badRequest().build(); // No hay suficiente stock
        }

        producto.setCantidad(nuevaCantidad);

        Producto productoActualizado = productoService.editarProducto(id, producto);
        return ResponseEntity.ok(productoActualizado);
    }

    // Aumentar la cantidad de un producto (para recepciones)
    @PatchMapping("/{id}/aumentar")
    public ResponseEntity<Producto> aumentarCantidadProducto(
            @PathVariable Long id,
            @RequestParam Integer cantidad) {

        if (cantidad <= 0) {
            return ResponseEntity.badRequest().build(); // La cantidad a aumentar debe ser positiva
        }

        Optional<Producto> productoOpt = productoService.obtenerProductoPorId(id);

        if (!productoOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Producto producto = productoOpt.get();
        int nuevaCantidad = producto.getCantidad() + cantidad;
        producto.setCantidad(nuevaCantidad);

        Producto productoActualizado = productoService.editarProducto(id, producto);
        return ResponseEntity.ok(productoActualizado);
    }
}
