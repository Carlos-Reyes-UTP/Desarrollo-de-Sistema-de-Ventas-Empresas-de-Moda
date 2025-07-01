package com.tienda.ropa.service.impl;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Talla;
import com.tienda.ropa.repository.ColorRepository;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.TallaRepository;
import com.tienda.ropa.service.CodigoBarrasService;
import com.tienda.ropa.service.ProductoVarianteService;
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
    private TallaRepository tallaRepository;

    @Autowired
    private ColorRepository colorRepository;

    @Autowired
    private CodigoBarrasService codigoBarrasService;

    @Override
    public ProductoVariante crearVariante(ProductoVariante productoVariante) {
        // No crear variantes con talla 'Única' o color 'Único'
        if (productoVariante.getTalla() != null && "Única".equalsIgnoreCase(productoVariante.getTalla().getNombreTalla())) {
            throw new IllegalArgumentException("No se permite crear variantes con talla 'Única'");
        }
        if (productoVariante.getColor() != null && "Único".equalsIgnoreCase(productoVariante.getColor().getNombre())) {
            throw new IllegalArgumentException("No se permite crear variantes con color 'Único'");
        }
        if (productoVariante.getCodigoBarrasVariante() == null || productoVariante.getCodigoBarrasVariante().isEmpty()) {
            Producto producto = productoVariante.getProducto();
            Talla talla = productoVariante.getTalla();
            Color color = productoVariante.getColor();
            String codigo = producto.getCodigoIdentificacion() + "-" + talla.getNombreTalla() + "-" + color.getNombre();
            productoVariante.setCodigoBarrasVariante(codigo);
        }
        ProductoVariante guardada = productoVarianteRepository.save(productoVariante);
        return guardada;
    }

    @Override
    public ProductoVariante actualizarVariante(Long idVariante, ProductoVariante productoVariante) {
        if (!productoVarianteRepository.existsById(idVariante)) {
            throw new IllegalArgumentException("No existe una variante con el ID: " + idVariante);
        }
        productoVariante.setIdProductoVariante(idVariante);
        return productoVarianteRepository.save(productoVariante);
    }

    @Override
    public Optional<ProductoVariante> obtenerVariantePorId(Long idVariante) {
        return productoVarianteRepository.findById(idVariante);
    }

    @Override
    public List<ProductoVariante> obtenerTodasLasVariantes() {
        return productoVarianteRepository.findAll();
    }

    @Override
    public List<Object[]> obtenerTodasLasVariantesParaCajero() {
        return productoVarianteRepository.findAllVariantesConInformacionCompleta();
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        return productoVarianteRepository.findByProducto(producto);
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProductoYTalla(Long idProducto, Long idTalla) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        Talla talla = tallaRepository.findById(idTalla)
                .orElseThrow(() -> new IllegalArgumentException("No existe una talla con el ID: " + idTalla));
        return productoVarianteRepository.findByProductoAndTalla(producto, talla);
    }

    @Override
    public List<ProductoVariante> obtenerVariantesPorProductoYColor(Long idProducto, Long idColor) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        Color color = colorRepository.findById(idColor)
                .orElseThrow(() -> new IllegalArgumentException("No existe un color con el ID: " + idColor));
        return productoVarianteRepository.findByProductoAndColor(producto, color);
    }

    @Override
    public Optional<ProductoVariante> obtenerVariantePorProductoTallaColor(Long idProducto, Long idTalla, Long idColor) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));
        Talla talla = tallaRepository.findById(idTalla)
                .orElseThrow(() -> new IllegalArgumentException("No existe una talla con el ID: " + idTalla));
        Color color = colorRepository.findById(idColor)
                .orElseThrow(() -> new IllegalArgumentException("No existe un color con el ID: " + idColor));
        return productoVarianteRepository.findByProductoAndTallaAndColor(producto, talla, color);
    }

    @Override
    public ProductoVariante actualizarCantidad(Long idVariante, Integer nuevaCantidad) {
        if (nuevaCantidad < 0) {
            throw new IllegalArgumentException("La cantidad no puede ser negativa");
        }

        ProductoVariante variante = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe una variante con el ID: " + idVariante));

        variante.setCantidad(nuevaCantidad);
        return productoVarianteRepository.save(variante);
    }

    @Override
    @Transactional
    public void eliminarVariante(Long idVariante) {
        // Verificar si la variante existe
        ProductoVariante variante = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new IllegalArgumentException("No existe una variante con el ID: " + idVariante));
        
        try {
            // Eliminar la variante
            productoVarianteRepository.deleteById(idVariante);
            
            // Confirmar que la variante ya no existe para evitar duplicaciones
            if (productoVarianteRepository.existsById(idVariante)) {
                throw new IllegalStateException("Error al eliminar la variante. La variante aún existe después de la eliminación.");
            }
        } catch (Exception e) {
            // Registrar el error
            System.err.println("Error al eliminar variante: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public Integer obtenerCantidadTotalProducto(Long idProducto) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));

        List<ProductoVariante> variantes = productoVarianteRepository.findByProducto(producto);
        return variantes.stream()
                .mapToInt(ProductoVariante::getCantidad)
                .sum();
    }

    @Override
    @Transactional
    public List<ProductoVariante> migrarProductoAVariantes(
            Long idProducto,
            List<Talla> tallas,
            List<Color> colores,
            boolean distribucionPorcentual) {

        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new IllegalArgumentException("No existe un producto con el ID: " + idProducto));

        Integer stockActual = producto.getCantidad();
        int totalVariantes = tallas.size() * colores.size();

        if (totalVariantes == 0) {
            throw new IllegalArgumentException("Debe proporcionar al menos una talla y un color");
        }

        List<ProductoVariante> nuevasVariantes = new ArrayList<>();

        for (Talla talla : tallas) {
            if ("Única".equalsIgnoreCase(talla.getNombreTalla())) continue;
            for (Color color : colores) {
                if ("Único".equalsIgnoreCase(color.getNombre())) continue;
                // Verificar si ya existe esta combinación
                Optional<ProductoVariante> varianteExistente =
                        productoVarianteRepository.findByProductoAndTallaAndColor(producto, talla, color);

                if (varianteExistente.isPresent()) {
                    nuevasVariantes.add(varianteExistente.get());
                    continue;
                }

                // Crear nueva variante
                ProductoVariante nuevaVariante = new ProductoVariante();
                nuevaVariante.setProducto(producto);
                nuevaVariante.setTalla(talla);
                nuevaVariante.setColor(color);

                // Calcular la cantidad según la distribución
                if (distribucionPorcentual && stockActual > 0) {
                    nuevaVariante.setCantidad(stockActual / totalVariantes);
                } else {
                    nuevaVariante.setCantidad(0);
                }

                // Generar código de barras único para la variante (si se necesita)
                nuevaVariante.setCodigoBarrasVariante(
                        producto.getCodigoIdentificacion() + "-" + talla.getNombreTalla() + "-" + color.getNombre());

                nuevasVariantes.add(productoVarianteRepository.save(nuevaVariante));
            }
        }

        // Si se distribuyó el stock, actualizar el stock del producto principal a 0
        if (distribucionPorcentual && stockActual > 0) {
            producto.setCantidad(0);
            productoRepository.save(producto);
        }

        return nuevasVariantes;
    }
}
