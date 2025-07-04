package com.tienda.ropa.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.service.ProductoService;
import com.tienda.ropa.service.ProductoVarianteService;

@RestController
@RequestMapping("/api/cajero/productos")
@CrossOrigin(origins = "*")
public class CajeroProductoController {

    @Autowired
    private ProductoService productoService;

    @Autowired
    private ProductoVarianteService productoVarianteService;

    // Obtener todas las variantes de productos (método principal para ventas)
    @GetMapping("/variantes")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodasLasVariantes() {
        System.out.println("DEBUG: Endpoint /api/cajero/productos/variantes fue llamado");
        
        List<Object[]> resultados = productoVarianteService.obtenerTodasLasVariantesParaCajero();
        System.out.println("DEBUG: Se encontraron " + resultados.size() + " variantes");
        
        List<Map<String, Object>> variantes = resultados.stream().map(resultado -> {
            Map<String, Object> variante = new HashMap<>();
            variante.put("idProductoVariante", resultado[0]);
            variante.put("codigoBarrasVariante", resultado[1]);
            variante.put("cantidad", resultado[2]);
            
            // Información del producto
            Map<String, Object> producto = new HashMap<>();
            producto.put("idProducto", resultado[3]);
            producto.put("nombre", resultado[4]);
            producto.put("sexo", resultado[5]);
            producto.put("tipoPublico", resultado[6]); // NUEVO CAMPO
            producto.put("codigoIdentificacion", resultado[7]);
            producto.put("precioUnitario", resultado[8]);
            variante.put("producto", producto);
            
            // Información de talla
            Map<String, Object> talla = new HashMap<>();
            talla.put("idTalla", resultado[9]);
            talla.put("nombreTalla", resultado[10]);
            variante.put("talla", talla);
            
            // Información de color
            Map<String, Object> color = new HashMap<>();
            color.put("idColor", resultado[11]);
            color.put("nombre", resultado[12]);
            variante.put("color", color);
            
            // Información de categorías
            Map<String, Object> categorias = new HashMap<>();
            categorias.put("categoria", resultado[13]); // Subcategoría principal
            categorias.put("subCategoria2", resultado[14]); // NUEVO CAMPO
            variante.put("categorias", categorias);
            
            return variante;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(variantes);
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
        return productoVarianteService.obtenerVariantesPorProducto(idProducto);
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
        int nuevaCantidad = variante.getCantidad() - cantidad;

        if (nuevaCantidad < 0) {
            return ResponseEntity.badRequest().build(); // No hay suficiente stock
        }

        ProductoVariante varianteActualizada = productoVarianteService.actualizarCantidad(id, nuevaCantidad);
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
