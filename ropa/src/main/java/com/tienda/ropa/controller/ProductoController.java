package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Precio;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/productos")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    @PostMapping
    public Producto crearProducto(@RequestBody Producto producto) {
        return productoService.agregarProducto(producto);
    }

    @GetMapping("/{id}")
    public Optional<Producto> obtenerProductoPorId(@PathVariable Long id) {
        return productoService.obtenerProductoPorId(id);
    }

    @GetMapping
    public List<Producto> obtenerTodosLosProductos() {
        return productoService.obtenerProductos();
    }

    @PutMapping("/{id}")
    public Producto editarProducto(@PathVariable Long id, @RequestBody Producto productoActualizado) {
        return productoService.editarProducto(id, productoActualizado);
    }

    @DeleteMapping("/{id}")
    public void eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
    }

    @GetMapping("/categoria/{categoria}")
    public List<Producto> obtenerProductosPorCategoria(@PathVariable String categoria) {
        return productoService.obtenerProductosPorCategoria(categoria);
    }

    @GetMapping("/distribuidor/{nombreDistribuidor}")
    public List<Producto> obtenerProductosPorDistribuidor(@PathVariable String nombreDistribuidor) {
        return productoService.obtenerProductosPorDistribuidor(nombreDistribuidor);
    }

    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<List<Producto>> obtenerProductosPorCodigo(@PathVariable String codigo) {
        List<Producto> productos = productoService.obtenerProductosPorCodigo(codigo);
        if (productos.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(productos);
    }

    @GetMapping("/nombre/{nombre}")
    public List<Producto> obtenerProductosPorNombre(@PathVariable String nombre) {
        return productoService.obtenerProductosPorNombre(nombre);
    }

    @GetMapping("/{idProducto}/precios")
    public List<Precio> obtenerPreciosPorProducto(@PathVariable Long idProducto) {
        return productoService.obtenerPreciosPorProducto(idProducto);
    }
}