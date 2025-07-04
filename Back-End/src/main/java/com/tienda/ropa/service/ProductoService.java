package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.ColorRepository;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.ProveedoresRepository;
import com.tienda.ropa.repository.TallaRepository;

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
        // Validar y configurar las categorías correctamente
        configurarCategorias(producto);
        
        // Generar código de barras automáticamente si no se proporciona
        if (producto.getCodigoBarras() == null || producto.getCodigoBarras().trim().isEmpty()) {
            String codigoBarrasGenerado = generarCodigoBarrasUnico(producto.getCodigoIdentificacion());
            producto.setCodigoBarras(codigoBarrasGenerado);
        }
        
        return productoRepository.save(producto);
    }
    
    /**
     * Configura correctamente las categorías padre e hija del producto
     */
    private void configurarCategorias(Producto producto) {
        // Validar que al menos una categoría esté presente
        if (producto.getCategoria() == null && producto.getCategoriaPadre() == null) {
            throw new IllegalArgumentException("El producto debe tener al menos una categoría (subcategoría o categoría padre)");
        }
        
        if (producto.getCategoria() != null) {
            // Caso 1: Si la categoría asignada tiene una categoría padre en la BD
            if (producto.getCategoria().getCategoriaPadre() != null) {
                // La categoría actual es una subcategoría real
                // Establecer automáticamente su categoría padre
                producto.setCategoriaPadre(producto.getCategoria().getCategoriaPadre());
            } 
            // Caso 2: Si se recibió una categoriaPadre explícitamente desde el frontend
            else if (producto.getCategoriaPadre() != null) {
                // Verificar si categoria y categoriaPadre son iguales
                if (producto.getCategoria().getIdCategoria().equals(producto.getCategoriaPadre().getIdCategoria())) {
                    // Es una categoría principal sin hijos que se envió duplicada
                    // Limpiar el campo categoria y mantener solo categoriaPadre
                    producto.setCategoria(null);
                } else {
                    // Son diferentes - mantener la configuración tal como viene
                    // (caso especial o configuración personalizada)
                }
            } else {
                // Caso 3: Solo se especificó categoria sin categoriaPadre
                // Verificar si la categoría tiene subcategorías
                if (producto.getCategoria().getSubCategorias() != null && 
                    !producto.getCategoria().getSubCategorias().isEmpty()) {
                    // La categoría tiene hijos, pero se está usando como categoria directa
                    // Esto podría ser un error, pero lo permitimos
                } else {
                    // La categoría no tiene hijos - debería ser categoriaPadre
                    // Mover categoria a categoriaPadre y limpiar categoria
                    producto.setCategoriaPadre(producto.getCategoria());
                    producto.setCategoria(null);
                }
            }
        } else if (producto.getCategoriaPadre() != null) {
            // Caso 4: Solo se especificó categoría padre (sin subcategoría)
            // Verificar que efectivamente la categoría padre no tenga subcategorías sería redundante
            // porque el frontend ya hizo esta validación
            
            // Estado actual: categoria=null, categoriaPadre=[Categoría]
            // Este es el estado CORRECTO para categorías principales sin hijos
            
            // ✅ NO necesitamos:
            // - producto.setCategoria(null);        // Ya es null
            // - producto.setCategoriaPadre(...);    // Ya está configurado correctamente
            // - Validaciones adicionales            // Frontend ya las hizo
        }
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
    }    @Transactional
    public Producto editarProducto(Long id, Producto productoActualizado) {
        return productoRepository.findById(id).map(producto -> {
            // Actualizar todas las propiedades del producto
            producto.setCodigoIdentificacion(productoActualizado.getCodigoIdentificacion());
            producto.setNombre(productoActualizado.getNombre());
            producto.setSexo(productoActualizado.getSexo());
            producto.setTipoPublico(productoActualizado.getTipoPublico());
            producto.setCategoria(productoActualizado.getCategoria());
            producto.setSubCategoria2(productoActualizado.getSubCategoria2());
            producto.setCategoriaPadre(productoActualizado.getCategoriaPadre());
            producto.setMarca(productoActualizado.getMarca());
            producto.setProveedor(productoActualizado.getProveedor());
            producto.setCantidad(productoActualizado.getCantidad());
            producto.setPrecioUnitario(productoActualizado.getPrecioUnitario());
            producto.setPrecioCuarto(productoActualizado.getPrecioCuarto());
            producto.setPrecioMediaDocena(productoActualizado.getPrecioMediaDocena());
            producto.setPrecioDocena(productoActualizado.getPrecioDocena());
            producto.setCodigoBarras(productoActualizado.getCodigoBarras());
            
            // Aplicar la misma lógica de configuración de categorías
            configurarCategorias(producto);
            
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

    // Nuevo método: Filtrar por categoría principal (productos que tienen esta categoría como padre)
    public List<Producto> obtenerProductosPorCategoriaPrincipal(String nombreCategoriaPrincipal) {
        Categoria categoriaPrincipal = categoriaRepository.findByNombre(nombreCategoriaPrincipal)
                .orElseThrow(() -> new IllegalArgumentException("Categoría principal no encontrada"));
        return productoRepository.findByCategoriaPadre(categoriaPrincipal);
    }

    // Nuevo método: Filtrar por subcategoría (productos que tienen esta categoría como subcategoría)
    public List<Producto> obtenerProductosPorSubCategoria(String nombreSubCategoria) {
        Categoria subCategoria = categoriaRepository.findByNombre(nombreSubCategoria)
                .orElseThrow(() -> new IllegalArgumentException("Subcategoría no encontrada"));
        return productoRepository.findByCategoria(subCategoria);
    }

    // Nuevo método: Filtrar por ambos criterios - categoría principal y subcategoría
    public List<Producto> obtenerProductosPorCategoriaPrincipalYSubCategoria(
            String nombreCategoriaPrincipal, 
            String nombreSubCategoria) {
        
        Categoria categoriaPrincipal = null;
        Categoria subCategoria = null;
        
        if (nombreCategoriaPrincipal != null && !nombreCategoriaPrincipal.isEmpty()) {
            categoriaPrincipal = categoriaRepository.findByNombre(nombreCategoriaPrincipal)
                    .orElseThrow(() -> new IllegalArgumentException("Categoría principal no encontrada"));
        }
        
        if (nombreSubCategoria != null && !nombreSubCategoria.isEmpty()) {
            subCategoria = categoriaRepository.findByNombre(nombreSubCategoria)
                    .orElseThrow(() -> new IllegalArgumentException("Subcategoría no encontrada"));
        }
        
        if (categoriaPrincipal != null && subCategoria != null) {
            return productoRepository.findByCategoriaPadreAndCategoria(categoriaPrincipal, subCategoria);
        } else if (categoriaPrincipal != null) {
            return productoRepository.findByCategoriaPadre(categoriaPrincipal);
        } else if (subCategoria != null) {
            return productoRepository.findByCategoria(subCategoria);
        } else {
            return productoRepository.findAll();
        }
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