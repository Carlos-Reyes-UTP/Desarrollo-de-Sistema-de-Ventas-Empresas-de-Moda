package com.tienda.ropa.service.impl;

import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.service.InventarioUbicacionService;
import com.tienda.ropa.service.ProductoVarianteService;
import com.tienda.ropa.util.SkuNormalizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ProductoVarianteServiceImpl implements ProductoVarianteService {

    @Autowired
    private ProductoVarianteRepository productoVarianteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private InventarioUbicacionService inventarioUbicacionService;

    @Override
    @Transactional
    public ProductoVariante crearVariante(ProductoVariante productoVariante) {
        if ("Única".equalsIgnoreCase(productoVariante.getTalla())) {
            throw new IllegalArgumentException("No se permite crear variantes con talla 'Única'");
        }
        if ("Único".equalsIgnoreCase(productoVariante.getColor())) {
            throw new IllegalArgumentException("No se permite crear variantes con color 'Único'");
        }
        Producto producto = productoRepository.findById(productoVariante.getProducto().getIdProducto())
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        productoVariante.setProducto(producto);
        if (productoVariante.getCodigoBarras() == null || productoVariante.getCodigoBarras().isEmpty()) {
            String codigo = producto.getCodigoIdentificacion() + "-" + productoVariante.getTalla() + "-" + productoVariante.getColor();
            productoVariante.setCodigoBarras(codigo);
        }
        if (productoVariante.getCantidad() == null) {
            productoVariante.setCantidad(0);
        }
        ProductoVariante guardada = productoVarianteRepository.save(productoVariante);
        if (guardada.getSku() == null || guardada.getSku().isBlank()) {
            guardada.setSku(SkuNormalizer.buildSku(
                    guardada.getProducto().getCodigoIdentificacion(),
                    guardada.getColor(),
                    guardada.getTalla(),
                    guardada.getIdProductoVariante()));
            guardada = productoVarianteRepository.save(guardada);
        }
        inventarioUbicacionService.asegurarFilaAlmacenConStock(guardada, guardada.getCantidad() != null ? guardada.getCantidad() : 0);
        guardada.setStockAlmacen(inventarioUbicacionService.stockEnAlmacen(guardada.getIdProductoVariante()));
        return guardada;
    }

    @Override
    @Transactional
    public ProductoVariante actualizarVariante(Long idVariante, ProductoVariante productoVariante) {
        ProductoVariante existente = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe una variante con el ID: " + idVariante));
        if (productoVariante.getColor() != null) {
            existente.setColor(productoVariante.getColor());
        }
        if (productoVariante.getTalla() != null) {
            existente.setTalla(productoVariante.getTalla());
        }
        if (productoVariante.getSku() != null) {
            existente.setSku(productoVariante.getSku());
        }
        if (productoVariante.getCodigoBarras() != null) {
            existente.setCodigoBarras(productoVariante.getCodigoBarras());
        }
        if (productoVariante.getCantidad() != null) {
            existente.setCantidad(productoVariante.getCantidad());
        }
        if (productoVariante.getProducto() != null && productoVariante.getProducto().getIdProducto() != null) {
            Producto p = productoRepository.findById(productoVariante.getProducto().getIdProducto())
                    .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
            existente.setProducto(p);
        }
        ProductoVariante guardada = productoVarianteRepository.save(existente);
        inventarioUbicacionService.sincronizarCantidadVariante(idVariante);
        guardada.setStockAlmacen(inventarioUbicacionService.stockEnAlmacen(idVariante));
        return guardada;
    }

    @Override
    public Optional<ProductoVariante> obtenerVariantePorId(Long idVariante) {
        Optional<ProductoVariante> opt = productoVarianteRepository.findById(idVariante);
        opt.ifPresent(v -> v.setStockAlmacen(inventarioUbicacionService.stockEnAlmacen(v.getIdProductoVariante())));
        return opt;
    }

    @Override
    public List<ProductoVariante> obtenerTodasLasVariantes() {
        List<ProductoVariante> variantes = productoVarianteRepository.findAll();
        variantes.forEach(v -> v.setStockAlmacen(inventarioUbicacionService.stockEnAlmacen(v.getIdProductoVariante())));
        return variantes;
    }

    @Override
    public List<Object[]> obtenerTodasLasVariantesParaCajero() {
        return productoVarianteRepository.findAllVariantesConInformacionCompleta();
    }

    @Override
    public org.springframework.data.domain.Page<Object[]> obtenerVariantesPaginadasParaCajero(
            String busqueda, org.springframework.data.domain.Pageable pageable) {
        String termino = busqueda == null ? "" : busqueda.trim();
        if (termino.isEmpty()) {
            return productoVarianteRepository.findVariantesPaginadasSinBusqueda(pageable);
        }
        return productoVarianteRepository.findVariantesPaginadasConBusqueda(termino, pageable);
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        List<ProductoVariante> variantes = productoVarianteRepository.findByProductoWithInventarios(producto);
        variantes.forEach(v -> v.setStockAlmacen(inventarioUbicacionService.stockEnAlmacen(v.getIdProductoVariante())));
        return variantes;
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProductoYTallaNombre(Long idProducto, String nombreTalla) {
        return productoVarianteRepository.findByProducto_IdProductoAndTallaIgnoreCase(idProducto, nombreTalla);
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProductoYColorNombre(Long idProducto, String nombreColor) {
        return productoVarianteRepository.findByProducto_IdProductoAndColorIgnoreCase(idProducto, nombreColor);
    }

    @Override
    public Optional<ProductoVariante> obtenerVariantePorProductoTallaColorNombre(Long idProducto, String talla, String color) {
        return productoVarianteRepository.findByProducto_IdProductoAndTallaIgnoreCaseAndColorIgnoreCase(
                idProducto, talla, color);
    }

    @Override
    @Transactional
    public ProductoVariante actualizarCantidad(Long idVariante, Integer nuevaCantidad) {
        if (nuevaCantidad < 0) {
            throw new IllegalArgumentException("La cantidad no puede ser negativa");
        }
        if (!productoVarianteRepository.existsById(idVariante)) {
            throw new IllegalArgumentException("No existe una variante con el ID: " + idVariante);
        }
        int actual = inventarioUbicacionService.stockEnAlmacen(idVariante);
        int delta = nuevaCantidad - actual;
        inventarioUbicacionService.aplicarDeltaEnUbicacion(
                idVariante,
                inventarioUbicacionService.ubicacionAlmacen(),
                delta,
                "Stock insuficiente en Almacén para reducir la cantidad solicitada");
        ProductoVariante v = productoVarianteRepository.findById(idVariante).orElseThrow();
        v.setStockAlmacen(nuevaCantidad);
        return v;
    }

    @Override
    @Transactional
    public void eliminarVariante(Long idVariante) {
        ProductoVariante variante = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe una variante con el ID: " + idVariante));
        productoVarianteRepository.delete(variante);
    }

    @Override
    public Integer obtenerCantidadTotalProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        return productoVarianteRepository.findByProducto(producto).stream()
                .mapToInt(v -> inventarioUbicacionService.stockTotalVariante(v.getIdProductoVariante()))
                .sum();
    }

    @Override
    @Transactional
    public List<ProductoVariante> migrarProductoAVariantes(
            Long idProducto,
            List<String> tallas,
            List<String> colores,
            boolean distribucionPorcentual) {

        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));

        Integer stockActual = producto.getCantidad();

        List<String> listaTallas = tallas != null ? tallas : List.of();
        List<String> listaColores = colores != null ? colores : List.of();
        int totalVariantes = listaTallas.size() * listaColores.size();

        if (totalVariantes == 0) {
            throw new IllegalArgumentException("Debe proporcionar al menos una talla y un color");
        }

        List<ProductoVariante> nuevasVariantes = new ArrayList<>();

        for (String nombreTalla : listaTallas) {
            if (nombreTalla == null || "Única".equalsIgnoreCase(nombreTalla.trim())) {
                continue;
            }
            for (String nombreColor : listaColores) {
                if (nombreColor == null || "Único".equalsIgnoreCase(nombreColor.trim())) {
                    continue;
                }
                Optional<ProductoVariante> varianteExistente =
                        productoVarianteRepository.findByProducto_IdProductoAndTallaIgnoreCaseAndColorIgnoreCase(
                                idProducto, nombreTalla.trim(), nombreColor.trim());

                if (varianteExistente.isPresent()) {
                    nuevasVariantes.add(varianteExistente.get());
                    continue;
                }

                ProductoVariante nuevaVariante = new ProductoVariante();
                nuevaVariante.setProducto(producto);
                nuevaVariante.setTalla(nombreTalla.trim());
                nuevaVariante.setColor(nombreColor.trim());

                if (distribucionPorcentual && stockActual != null && stockActual > 0) {
                    nuevaVariante.setCantidad(stockActual / totalVariantes);
                } else {
                    nuevaVariante.setCantidad(0);
                }

                nuevaVariante.setCodigoBarras(
                        producto.getCodigoIdentificacion() + "-" + nombreTalla.trim() + "-" + nombreColor.trim());

                ProductoVariante guardada = productoVarianteRepository.save(nuevaVariante);
                guardada.setSku(SkuNormalizer.buildSku(
                        producto.getCodigoIdentificacion(),
                        guardada.getColor(),
                        guardada.getTalla(),
                        guardada.getIdProductoVariante()));
                guardada = productoVarianteRepository.save(guardada);
                inventarioUbicacionService.asegurarFilaAlmacenConStock(guardada, guardada.getCantidad());
                nuevasVariantes.add(guardada);
            }
        }

        if (distribucionPorcentual && stockActual != null && stockActual > 0) {
            producto.setCantidad(0);
            productoRepository.save(producto);
        }

        return nuevasVariantes;
    }
}
