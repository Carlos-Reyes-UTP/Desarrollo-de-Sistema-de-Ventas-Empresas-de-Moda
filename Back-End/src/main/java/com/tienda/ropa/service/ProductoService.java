package com.tienda.ropa.service;

import com.tienda.ropa.entity.Categoria;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.repository.CategoriaRepository;

import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProveedoresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private ProveedoresRepository proveedoresRepository;

    public Producto agregarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    public Producto editarProducto(Long id, Producto productoActualizado) {
        return productoRepository.findById(id).map(producto -> {
            producto.setCodigoIdentificacion(productoActualizado.getCodigoIdentificacion());
            producto.setNombre(productoActualizado.getNombre());
            producto.setCategoria(productoActualizado.getCategoria());
            producto.setProveedor(productoActualizado.getProveedor());
            producto.setCantidad(productoActualizado.getCantidad());
            return productoRepository.save(producto);
        }).orElseThrow(() -> new IllegalArgumentException("Producto no encontrado con el ID: " + id));
    }

    public Optional<Producto> obtenerProductoPorId(Long id) {
        return productoRepository.findById(id);
    }

    public List<Producto> obtenerProductos() {
        return productoRepository.findAll();
    }

    public void eliminarProducto(Long id) {
        if (productoRepository.existsById(id)) {
            productoRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Producto no encontrado con el ID: " + id);
        }
    }

    public List<Producto> obtenerProductosPorCategoria(String nombreCategoria) {
        Categoria categoria = categoriaRepository.findByNombre(nombreCategoria)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        return productoRepository.findByCategoria(categoria);
    }

    public List<Producto> obtenerProductosPorProveedor(String nombreProveedor) {  // Cambiar método
        Proveedores proveedor = proveedoresRepository.findByNombre(nombreProveedor)
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado"));
        return productoRepository.findByProveedor(proveedor);  // Actualizar referencia
    }

    public List<Producto> obtenerProductosPorCodigo(String codigo) {
        return productoRepository.findByCodigoIdentificacion(codigo);
    }

    public List<Producto> obtenerProductosPorNombre(String nombre) {
        return productoRepository.findByNombre(nombre);
    }
}