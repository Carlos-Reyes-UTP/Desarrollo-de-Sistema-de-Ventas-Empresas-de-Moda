package com.tienda.ropa.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.ProveedoresRepository;
import com.tienda.ropa.service.InventarioService;
import com.tienda.ropa.service.ProductoVarianteService;

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
    private InventarioRepository inventarioRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private ProductoVarianteService productoVarianteService;

    @Autowired
    private InventarioContextService inventarioContextService;

    @Transactional
    public Producto agregarProducto(Producto producto) {
        if (producto.getCodigoIdentificacion() != null
                && !producto.getCodigoIdentificacion().isBlank()
                && productoRepository.existsByCodigoIdentificacion(producto.getCodigoIdentificacion().trim())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Ya existe un producto con el código de identificación: "
                            + producto.getCodigoIdentificacion().trim());
        }
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
            producto.setDescripcion(productoActualizado.getDescripcion());
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

    public org.springframework.data.domain.Page<Producto> obtenerProductosPaginados(
            String busqueda, org.springframework.data.domain.Pageable pageable) {
        return obtenerProductosPaginados(busqueda, pageable, null, null);
    }

    public org.springframework.data.domain.Page<Producto> obtenerProductosPaginados(
            String busqueda,
            org.springframework.data.domain.Pageable pageable,
            Usuario usuario,
            String sector) {
        String termino = busqueda == null ? "" : busqueda.trim();
        boolean sinBusqueda = termino.isEmpty();
        org.springframework.data.domain.Page<Producto> page;

        if (usuario != null && inventarioContextService.esAlmaceneroDeLinea(usuario)) {
            Long idUa = usuario.getAreaAsignado() != null
                    ? usuario.getAreaAsignado().getIdUbicacionArea()
                    : null;
            if (idUa == null) {
                return org.springframework.data.domain.Page.empty(pageable);
            }
            page = sinBusqueda
                    ? productoRepository.findProductosConStockEnUbicacionArea(idUa, pageable)
                    : productoRepository.findProductosConStockEnUbicacionAreaConBusqueda(idUa, termino, pageable);
            enriquecerStock(page, ids -> productoRepository.findStockAlmacenByProductoIdsAndUbicacionArea(ids, idUa));
            return page;
        }

        if (usuario != null && inventarioContextService.esAlmaceneroGeneral(usuario)) {
            String sectorNorm = sector == null ? InventarioContextService.NOMBRE_AREA_GENERAL : sector.trim();
            if (InventarioContextService.NOMBRE_AREA_GENERAL.equalsIgnoreCase(sectorNorm)) {
                page = sinBusqueda
                        ? productoRepository.findProductosPaginadosSinBusqueda(pageable)
                        : productoRepository.findProductosPaginadosConBusqueda(termino, pageable);
                enriquecerStock(page, productoRepository::findStockAlmacenByProductoIds);
            } else {
                Long idArea = inventarioContextService.idAreaCatalogoPorNombre(sectorNorm);
                if (idArea == null) {
                    return org.springframework.data.domain.Page.empty(pageable);
                }
                // Catálogo completo: el stock por sector puede ser 0 sin ocultar el producto.
                page = sinBusqueda
                        ? productoRepository.findProductosPaginadosSinBusqueda(pageable)
                        : productoRepository.findProductosPaginadosConBusqueda(termino, pageable);
                Long idAreaFinal = idArea;
                enriquecerStock(page, ids -> productoRepository.findStockAlmacenByProductoIdsAndAreaCatalogo(ids, idAreaFinal));
            }
            return page;
        }

        page = sinBusqueda
                ? productoRepository.findProductosPaginadosSinBusqueda(pageable)
                : productoRepository.findProductosPaginadosConBusqueda(termino, pageable);
        enriquecerStock(page, productoRepository::findStockAlmacenByProductoIds);
        return page;
    }

    private void enriquecerStock(
            org.springframework.data.domain.Page<Producto> page,
            java.util.function.Function<List<Long>, List<Object[]>> stockLoader) {
        if (!page.hasContent()) {
            return;
        }
        List<Long> ids = page.getContent().stream()
                .map(Producto::getIdProducto)
                .collect(Collectors.toList());
        Map<Long, Integer> map = stockLoader.apply(ids).stream()
                .collect(Collectors.toMap(
                        r -> ((Number) r[0]).longValue(),
                        r -> ((Number) r[1]).intValue()));
        page.getContent().forEach(p -> p.setStockAlmacen(map.getOrDefault(p.getIdProducto(), 0)));
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

    /**
     * Coincidencias por fragmento de nombre (no sensible a mayúsculas), ordenadas por nombre.
     */
    public List<Producto> buscarProductosPorNombreContiene(String fragmento, int limite) {
        if (fragmento == null || fragmento.isBlank()) {
            return List.of();
        }
        int n = Math.max(1, Math.min(limite, 20));
        return productoRepository.findByNombreContainingIgnoreCaseOrderByNombreAsc(
                fragmento.trim(), PageRequest.of(0, n));
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
                    v.setCodigoBarras(variante.getCodigoBarras());
                    v.setSku(variante.getSku());
                    productoVarianteRepository.save(v);
                    inventarioService.establecerStockAlmacen(
                            v.getIdProductoVariante(), v.getCantidad() != null ? v.getCantidad() : 0);
                }
            } else {
                // Verificar si ya existe una variante con la misma talla y color
                Optional<ProductoVariante> varianteExistente =
                        productoVarianteRepository.findByProducto_IdProductoAndTallaIgnoreCaseAndColorIgnoreCase(
                                productoGuardado.getIdProducto(), variante.getTalla(), variante.getColor());
                
                if (varianteExistente.isPresent()) {
                    // Actualizar la cantidad y código de la variante existente
                    ProductoVariante v = varianteExistente.get();
                    v.setCantidad(variante.getCantidad());
                    if (variante.getCodigoBarras() != null) {
                        v.setCodigoBarras(variante.getCodigoBarras());
                    }
                    productoVarianteRepository.save(v);
                    inventarioService.establecerStockAlmacen(
                            v.getIdProductoVariante(), v.getCantidad() != null ? v.getCantidad() : 0);
                } else {
                    // Es una nueva variante, crearla
                    variante.setProducto(productoGuardado);
                    if (variante.getCodigoBarras() == null || variante.getCodigoBarras().isEmpty()) {
                        String codigo = productoGuardado.getCodigoIdentificacion() + "-" +
                                variante.getTalla() + "-" +
                                variante.getColor();
                        variante.setCodigoBarras(codigo);
                    }
                    if (variante.getCantidad() == null) {
                        variante.setCantidad(0);
                    }
                    productoVarianteService.crearVariante(variante, inventarioService.ubicacionAreaAlmacen());
                }
            }
        }
        
        List<Long> idsVariantesFinal = productoVarianteRepository.findByProducto(productoGuardado).stream()
                .map(ProductoVariante::getIdProductoVariante)
                .toList();
        int cantidadTotal = idsVariantesFinal.isEmpty() ? 0
                : inventarioRepository.sumStockByVariantes(idsVariantesFinal);
        productoGuardado.setCantidad(cantidadTotal);
        productoRepository.save(productoGuardado);

        return productoGuardado;
    }
}
