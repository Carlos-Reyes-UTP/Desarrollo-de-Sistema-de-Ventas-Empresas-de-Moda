package com.tienda.ropa.service;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Color;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.entity.Talla;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.ColorRepository;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.ProveedoresRepository;
import com.tienda.ropa.repository.TallaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Autowired
    private ProductoVarianteRepository productoVarianteRepository;

    @Autowired
    private TallaRepository tallaRepository;

    @Autowired
    private ColorRepository colorRepository;    @Transactional
    public Producto agregarProducto(Producto producto) {
        // Generar código de barras automáticamente si no se proporciona
        if (producto.getCodigoBarras() == null || producto.getCodigoBarras().trim().isEmpty()) {
            String codigoBarrasGenerado = generarCodigoBarrasUnico(producto.getCodigoIdentificacion());
            producto.setCodigoBarras(codigoBarrasGenerado);
        }
        
        Producto productoGuardado = productoRepository.save(producto);
        return productoGuardado;
    }
    
    private String generarCodigoBarrasUnico(String codigoIdentificacion) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String codigoBase = codigoIdentificacion != null ? codigoIdentificacion.replaceAll("[^A-Za-z0-9]", "") : "PROD";
        
        // Crear código de barras: CODIGOBASE-TIMESTAMP
        String codigoGenerado = codigoBase + "-" + timestamp;
        
        // Verificar unicidad (aunque es muy improbable que haya duplicados con timestamp)
        int contador = 1;
        String codigoFinal = codigoGenerado;
        while (productoRepository.existsByCodigoBarras(codigoFinal)) {
            codigoFinal = codigoGenerado + "-" + contador;
            contador++;
        }
        
        return codigoFinal;
    }@Transactional
    public Producto editarProducto(Long id, Producto productoActualizado) {
        return productoRepository.findById(id).map(producto -> {
            // Actualizar todas las propiedades del producto
            producto.setCodigoIdentificacion(productoActualizado.getCodigoIdentificacion());
            producto.setNombre(productoActualizado.getNombre());
            producto.setSexo(productoActualizado.getSexo());
            producto.setCategoria(productoActualizado.getCategoria());
            producto.setCategoriaPadre(productoActualizado.getCategoriaPadre());
            producto.setMarca(productoActualizado.getMarca());
            producto.setProveedor(productoActualizado.getProveedor());
            producto.setCantidad(productoActualizado.getCantidad());
            producto.setPrecioUnitario(productoActualizado.getPrecioUnitario());
            producto.setPrecioCuarto(productoActualizado.getPrecioCuarto());
            producto.setPrecioMediaDocena(productoActualizado.getPrecioMediaDocena());
            producto.setPrecioDocena(productoActualizado.getPrecioDocena());
            producto.setCodigoBarras(productoActualizado.getCodigoBarras());
            
            // Guardar los cambios del producto
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

    @Transactional
    public Producto actualizarProductoConVariantes(Long idProducto, Producto productoActualizado, List<ProductoVariante> variantes) {
        // Primero, actualizar el producto principal
        Producto productoGuardado = editarProducto(idProducto, productoActualizado);
        
        // Si no hay variantes que procesar, solo devolver el producto actualizado
        if (variantes == null || variantes.isEmpty()) {
            return productoGuardado;
        }
        
        // Obtener las variantes existentes del producto
        List<ProductoVariante> variantesExistentes = productoVarianteRepository.findByProducto(productoGuardado);
        
        // Procesar cada variante
        for (ProductoVariante variante : variantes) {
            // Asegurar que la variante esté asociada al producto correcto
            variante.setProducto(productoGuardado);
            
            // Si la variante ya tiene un ID, buscarla entre las existentes
            if (variante.getIdProductoVariante() != null) {
                // Variante existente - actualizar
                Optional<ProductoVariante> varianteExistente = variantesExistentes.stream()
                        .filter(v -> v.getIdProductoVariante().equals(variante.getIdProductoVariante()))
                        .findFirst();
                
                if (varianteExistente.isPresent()) {
                    // Actualizar la variante existente
                    ProductoVariante v = varianteExistente.get();
                    v.setTalla(variante.getTalla());
                    v.setColor(variante.getColor());
                    v.setCantidad(variante.getCantidad());
                    v.setCodigoBarrasVariante(variante.getCodigoBarrasVariante());
                    productoVarianteRepository.save(v);
                }
            } else {
                // Verificar si ya existe una variante con la misma talla y color
                Optional<ProductoVariante> varianteExistente = productoVarianteRepository.findByProductoAndTallaAndColor(
                        productoGuardado, variante.getTalla(), variante.getColor());
                
                if (varianteExistente.isPresent()) {
                    // Actualizar la cantidad y código de la variante existente
                    ProductoVariante v = varianteExistente.get();
                    v.setCantidad(variante.getCantidad());
                    if (variante.getCodigoBarrasVariante() != null) {
                        v.setCodigoBarrasVariante(variante.getCodigoBarrasVariante());
                    }
                    productoVarianteRepository.save(v);
                } else {
                    // Es una nueva variante, crearla
                    // Generar código de barras si no tiene
                    if (variante.getCodigoBarrasVariante() == null || variante.getCodigoBarrasVariante().isEmpty()) {
                        String codigo = productoGuardado.getCodigoIdentificacion() + "-" + 
                                variante.getTalla().getNombreTalla() + "-" + 
                                variante.getColor().getNombre();
                        variante.setCodigoBarrasVariante(codigo);
                    }
                    productoVarianteRepository.save(variante);
                }
            }
        }
        
        // Actualizar la cantidad total del producto sumando todas las variantes
        Integer cantidadTotal = productoVarianteRepository.findByProducto(productoGuardado).stream()
                .mapToInt(ProductoVariante::getCantidad)
                .sum();
        productoGuardado.setCantidad(cantidadTotal);
        productoRepository.save(productoGuardado);
        
        return productoGuardado;
    }
}