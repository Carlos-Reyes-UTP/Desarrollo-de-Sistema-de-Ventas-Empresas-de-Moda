package com.tienda.ropa.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.entity.Categoria;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProveedoresRepository;

@ExtendWith(MockitoExtension.class)
class ProductoServiceUnitTest {

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @Mock
    private ProveedoresRepository proveedoresRepository;

    @InjectMocks
    private ProductoService productoService;

    @Test
    void testAgregarProducto_ExitosoYGeneraCodigoBarras() {
        // Datos de prueba
        Categoria catPadre = new Categoria();
        catPadre.setIdCategoria(1L);
        catPadre.setNombre("Polos");

        Proveedores proveedor = new Proveedores();
        proveedor.setIdProveedor(1L);

        Producto productoInput = new Producto();
        productoInput.setCodigoIdentificacion("TEST-PROD-01");
        productoInput.setNombre("Pantalón Denim");
        productoInput.setSexo("UNISEX");
        productoInput.setTipoPublico("ADULTO");
        productoInput.setMarca("Marca Prueba");
        productoInput.setCategoriaPadre(catPadre);
        productoInput.setProveedor(proveedor);
        
        // Asignar precios obligatorios válidos (decrecientes)
        productoInput.setPrecioUnitario(new BigDecimal("50.00"));
        productoInput.setPrecioCuarto(new BigDecimal("144.00")); // S/ 48
        productoInput.setPrecioMediaDocena(new BigDecimal("270.00")); // S/ 45
        productoInput.setPrecioDocena(new BigDecimal("480.00")); // S/ 40

        when(productoRepository.existsByCodigoIdentificacion("TEST-PROD-01")).thenReturn(false);
        when(productoRepository.save(any(Producto.class))).thenAnswer(invocation -> {
            Producto p = invocation.getArgument(0);
            p.setIdProducto(99L);
            p.setCodigoBarras("TESTPROD01-178491823901");
            return p;
        });

        Producto guardado = productoService.agregarProducto(productoInput);

        assertNotNull(guardado.getIdProducto());
        assertNotNull(guardado.getCodigoBarras());
        assertTrue(guardado.getCodigoBarras().startsWith("TESTPROD01-"));
    }

    @Test
    void testAgregarProducto_LanzaExcepcionPorCodigoDuplicado() {
        Producto producto = new Producto();
        producto.setCodigoIdentificacion("PROD-DUP-01");
        
        when(productoRepository.existsByCodigoIdentificacion("PROD-DUP-01")).thenReturn(true);
        
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> 
            productoService.agregarProducto(producto)
        );
        
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Ya existe un producto con el código de identificación"));
    }
}