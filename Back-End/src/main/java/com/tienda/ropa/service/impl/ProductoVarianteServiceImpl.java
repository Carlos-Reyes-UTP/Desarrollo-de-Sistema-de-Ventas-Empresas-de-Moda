package com.tienda.ropa.service.impl;



import com.tienda.ropa.dto.VarianteExportarDTO;
import com.tienda.ropa.dto.VarianteSugerenciasDTO;

import com.tienda.ropa.entity.Producto;

import com.tienda.ropa.entity.ProductoVariante;

import com.tienda.ropa.entity.UbicacionArea;

import com.tienda.ropa.repository.InventarioRepository;

import com.tienda.ropa.repository.ProductoRepository;

import com.tienda.ropa.repository.ProductoVarianteRepository;

import com.tienda.ropa.service.InventarioService;

import com.tienda.ropa.service.ProductoVarianteService;

import com.tienda.ropa.util.SkuNormalizer;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;



import java.util.ArrayList;

import java.util.List;

import java.util.Map;

import java.util.Optional;

import java.util.stream.Collectors;



@Service

public class ProductoVarianteServiceImpl implements ProductoVarianteService {



    @Autowired

    private ProductoVarianteRepository productoVarianteRepository;



    @Autowired

    private ProductoRepository productoRepository;



    @Autowired

    private InventarioService inventarioService;



    @Autowired

    private InventarioRepository inventarioRepository;



    @Override

    @Transactional

    public ProductoVariante crearVariante(ProductoVariante productoVariante, UbicacionArea areaEntrada) {

        if (areaEntrada == null) {

            throw new IllegalArgumentException("El área de entrada de stock es obligatoria.");

        }

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

        int stockInicial = guardada.getCantidad() != null ? guardada.getCantidad() : 0;

        inventarioService.establecerStockEnUbicacionArea(

                guardada.getIdProductoVariante(), areaEntrada, stockInicial);

        guardada.setStockAlmacen(inventarioService.stockEnUbicacionArea(

                guardada.getIdProductoVariante(), areaEntrada.getIdUbicacionArea()));

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

        inventarioService.sincronizarCantidadVariante(idVariante);

        guardada.setStockAlmacen(inventarioService.stockEnAlmacen(idVariante));

        return guardada;

    }



    @Override

    public Optional<ProductoVariante> obtenerVariantePorId(Long idVariante) {

        Optional<ProductoVariante> opt = productoVarianteRepository.findById(idVariante);

        opt.ifPresent(v -> v.setStockAlmacen(inventarioService.stockEnAlmacen(v.getIdProductoVariante())));

        return opt;

    }



    @Override

    public List<ProductoVariante> obtenerTodasLasVariantes() {

        List<ProductoVariante> variantes = productoVarianteRepository.findAll();

        if (!variantes.isEmpty()) {

            List<Long> ids = variantes.stream()

                    .map(ProductoVariante::getIdProductoVariante).toList();

            Map<Long, Integer> stockPorVariante = stockTotalBulk(ids);

            variantes.forEach(v -> v.setStockAlmacen(

                    stockPorVariante.getOrDefault(v.getIdProductoVariante(), 0)));

        }

        return variantes;

    }



    @Override

    @Transactional(readOnly = true)

    public VarianteSugerenciasDTO obtenerSugerenciasCatalogo() {

        return new VarianteSugerenciasDTO(

                productoVarianteRepository.findDistinctTallas(),

                productoVarianteRepository.findDistinctColores());

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

    public List<ProductoVariante> obtenerVariantesPorProducto(Long idProducto, Long idUbicacionArea) {

        if (!productoRepository.existsById(idProducto)) {

            throw new IllegalArgumentException("No existe un producto con el ID: " + idProducto);

        }

        List<ProductoVariante> variantes = productoVarianteRepository.findByProducto_IdProducto(idProducto);

        if (!variantes.isEmpty()) {

            List<Long> ids = variantes.stream()

                    .map(ProductoVariante::getIdProductoVariante).toList();

            Map<Long, Integer> stockPorVariante = idUbicacionArea != null

                    ? stockPorUbicacionBulk(ids, idUbicacionArea)

                    : inventarioService.stockEnAlmacenBulk(ids);

            variantes.forEach(v -> v.setStockAlmacen(

                    stockPorVariante.getOrDefault(v.getIdProductoVariante(), 0)));

            // Cargar idUbicacionArea de cada variante desde su registro en Inventario (solo almacén)
            Map<Long, Long> areaPorVariante = inventarioRepository.findAllByVariantesIds(ids).stream()

                    .filter(i -> i.getUbicacionArea() != null)

                    .filter(i -> inventarioService.esUbicacionAlmacen(i.getUbicacionArea()))

                    .collect(Collectors.toMap(

                            i -> i.getVariante().getIdProductoVariante(),

                            i -> i.getUbicacionArea().getIdUbicacionArea(),

                            (a, b) -> a));

            variantes.forEach(v -> v.setIdUbicacionArea(areaPorVariante.get(v.getIdProductoVariante())));

        }

        return variantes;

    }



    private Map<Long, Integer> stockPorUbicacionBulk(List<Long> idsVariante, long idUbicacionArea) {

        if (idsVariante.isEmpty()) {

            return Map.of();

        }

        return inventarioRepository.findAllByVariantesIds(idsVariante).stream()

                .filter(i -> i.getUbicacionArea() != null

                        && idUbicacionArea == i.getUbicacionArea().getIdUbicacionArea())

                .collect(Collectors.toMap(

                        i -> i.getVariante().getIdProductoVariante(),

                        i -> i.getStock() != null ? i.getStock() : 0,

                        Integer::sum));

    }



    private Map<Long, Integer> stockTotalBulk(List<Long> idsVariante) {

        if (idsVariante.isEmpty()) {

            return Map.of();

        }

        return inventarioRepository.findAllByVariantesIds(idsVariante).stream()

                .collect(Collectors.toMap(

                        i -> i.getVariante().getIdProductoVariante(),

                        i -> i.getStock() != null ? i.getStock() : 0,

                        Integer::sum));

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

    public ProductoVariante actualizarCantidad(Long idVariante, Integer nuevaCantidad, UbicacionArea areaStock) {

        if (nuevaCantidad < 0) {

            throw new IllegalArgumentException("La cantidad no puede ser negativa");

        }

        if (areaStock == null) {

            throw new IllegalArgumentException("El área de stock es obligatoria.");

        }

        if (!productoVarianteRepository.existsById(idVariante)) {

            throw new IllegalArgumentException("No existe una variante con el ID: " + idVariante);

        }

        inventarioService.establecerStockEnUbicacionArea(idVariante, areaStock, nuevaCantidad);

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

                .mapToInt(v -> inventarioService.stockTotalVariante(v.getIdProductoVariante()))

                .sum();

    }



    @Override

    @Transactional(readOnly = true)

    public List<VarianteExportarDTO> exportarListado(String area) {
        List<Object[]> resultados;

        if (area != null && !area.isBlank()) {
            resultados = productoVarianteRepository.findExportarPorArea(area.trim());
        } else {
            resultados = productoVarianteRepository.findExportarTodo();
        }

        List<Long> ids = resultados.stream()
                .map(r -> ((Number) r[0]).longValue())
                .toList();

        Map<Long, Integer> stockPorVariante = stockTotalBulk(ids);

        return resultados.stream().map(r -> {
            Long idVariante = ((Number) r[0]).longValue();
            int stock = stockPorVariante.getOrDefault(idVariante, 0);
            return new VarianteExportarDTO(
                    (String) r[1],    // codigoProducto
                    (String) r[2],    // nombreProducto
                    (String) r[3],    // talla
                    (String) r[4],    // color
                    (String) r[5],    // proveedor
                    (java.math.BigDecimal) r[6],  // precioUnitario
                    (java.math.BigDecimal) r[7],  // precioCuarto
                    (java.math.BigDecimal) r[8],  // precioMediaDocena
                    (java.math.BigDecimal) r[9],  // precioDocena
                    stock
            );
        }).toList();
    }

    @Override

    @Transactional

    public List<ProductoVariante> migrarProductoAVariantes(

            Long idProducto,

            List<String> tallas,

            List<String> colores,

            boolean distribucionPorcentual,

            UbicacionArea areaEntrada) {



        if (areaEntrada == null) {

            throw new IllegalArgumentException("El área de entrada de stock es obligatoria.");

        }



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

                inventarioService.establecerStockEnUbicacionArea(

                        guardada.getIdProductoVariante(),

                        areaEntrada,

                        guardada.getCantidad() != null ? guardada.getCantidad() : 0);

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


