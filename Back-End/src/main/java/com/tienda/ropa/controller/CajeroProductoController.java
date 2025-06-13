package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cajero/productos")
public class CajeroProductoController {

    @Autowired
    private ProductoService productoService;

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
