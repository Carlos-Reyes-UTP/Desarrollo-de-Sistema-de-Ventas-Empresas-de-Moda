package com.tienda.ropa.service;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Distribuidor;
import com.tienda.ropa.entity.Precio;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.DistribuidorRepository;
import com.tienda.ropa.repository.PrecioRepository;
import com.tienda.ropa.repository.ProductoRepository;
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
    private DistribuidorRepository distribuidorRepository;

    @Autowired
    private PrecioRepository precioRepository;

    public Producto agregarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    public Producto editarProducto(Long id, Producto productoActualizado) {
        return productoRepository.findById(id).map(producto -> {
            producto.setCodigoIdentificacion(productoActualizado.getCodigoIdentificacion());
            producto.setNombre(productoActualizado.getNombre());
            producto.setCategoria(productoActualizado.getCategoria());
            producto.setDistribuidor(productoActualizado.getDistribuidor());
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

    public List<Producto> obtenerProductosPorDistribuidor(String nombreDistribuidor) {
        Distribuidor distribuidor = distribuidorRepository.findByNombre(nombreDistribuidor)
                .orElseThrow(() -> new IllegalArgumentException("Distribuidor no encontrado"));
        return productoRepository.findByDistribuidor(distribuidor);
    }

    public List<Producto> obtenerProductosPorCodigo(String codigo) {
        return productoRepository.findByCodigoIdentificacion(codigo);
    }

    public List<Producto> obtenerProductosPorNombre(String nombre) {
        return productoRepository.findByNombre(nombre);
    }

    public List<Precio> obtenerPreciosPorProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado con el ID: " + idProducto));
        return precioRepository.findByProducto(producto);
    }
}