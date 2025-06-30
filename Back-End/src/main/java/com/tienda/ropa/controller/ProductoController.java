package com.tienda.ropa.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.service.ProductoService;

@RestController
@RequestMapping("/api/almacenero/productos")
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

    // Nuevo endpoint: Filtrar por categoría principal
    @GetMapping("/categoria-principal/{categoriaPrincipal}")
    public List<Producto> obtenerProductosPorCategoriaPrincipal(@PathVariable String categoriaPrincipal) {
        return productoService.obtenerProductosPorCategoriaPrincipal(categoriaPrincipal);
    }

    // Nuevo endpoint: Filtrar por subcategoría
    @GetMapping("/subcategoria/{subCategoria}")
    public List<Producto> obtenerProductosPorSubCategoria(@PathVariable String subCategoria) {
        return productoService.obtenerProductosPorSubCategoria(subCategoria);
    }

    // Nuevo endpoint: Filtrar por categoría principal y subcategoría (parámetros opcionales)
    @GetMapping("/filtrar-categorias")
    public List<Producto> obtenerProductosPorCategorias(
            @RequestParam(required = false) String categoriaPrincipal,
            @RequestParam(required = false) String subCategoria) {
        return productoService.obtenerProductosPorCategoriaPrincipalYSubCategoria(categoriaPrincipal, subCategoria);
    }

    @GetMapping("/distribuidor/{nombreDistribuidor}")
    public List<Producto> obtenerProductosPorDistribuidor(@PathVariable String nombreDistribuidor) {
        return productoService.obtenerProductosPorProveedor(nombreDistribuidor);
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

    @PutMapping("/{id}/con-variantes")
    public ResponseEntity<Producto> actualizarProductoConVariantes(
            @PathVariable Long id,
            @RequestBody Map<String, Object> datosActualizacion) {
        try {
            // Extraer producto y variantes del cuerpo de la solicitud
            Producto productoActualizado = new Producto();

            // Mapear propiedades básicas del producto
            if (datosActualizacion.containsKey("producto")) {
                // Convertir el mapa a un objeto Producto
                // Nota: En una implementación real, se usaría un ObjectMapper o similar
                // para una deserialización más robusta
                Map<String, Object> productData = (Map<String, Object>) datosActualizacion.get("producto");

                // Setear propiedades manualmente basadas en el mapa
                // Aquí iría el código para extraer y setear cada propiedad
                // Por ejemplo:
                // productoActualizado.setNombre((String) productData.get("nombre"));
                // ...

                // Para simplificar, obtener el producto existente y actualizar sus campos
                Optional<Producto> productoExistente = productoService.obtenerProductoPorId(id);
                if (productoExistente.isPresent()) {
                    productoActualizado = productoExistente.get();
                    // Actualizar campos según el mapa recibido
                    // ...
                } else {
                    return ResponseEntity.notFound().build();
                }
            }

            // Obtener lista de variantes
            List<ProductoVariante> variantes = new ArrayList<>();
            if (datosActualizacion.containsKey("variantes")) {
                List<Map<String, Object>> variantesData = (List<Map<String, Object>>) datosActualizacion.get("variantes");

                // Convertir cada mapa a un objeto ProductoVariante
                // Igual que antes, en una implementación real se usaría una deserialización más robusta
                // ...
            }

            // Llamar al servicio para actualizar el producto con sus variantes
            Producto resultado = productoService.actualizarProductoConVariantes(id, productoActualizado, variantes);
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }
}