package com.tienda.ropa;

import com.tienda.ropa.controller.ProductoController;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.service.ProductoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import java.util.List;
import static org.mockito.Mockito.*;
import java.util.Collections;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProductoController.class)
class ProductoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductoService productoService;

    /**
     * Prueba unitaria para el endpoint POST /productos.
     * 
     * Pasos:
     * 1. Se crea un objeto `Producto` con datos de prueba.
     * 2. Se configura el mock del servicio para devolver el producto creado.
     * 3. Se realiza una solicitud POST al endpoint `/productos` con un cuerpo JSON.
     * 4. Se verifica que el estado de la respuesta sea 200 (OK).
     * 5. Se valida que el JSON de la respuesta contenga los datos del producto.
     * 6. Se asegura que el método `agregarProducto` del servicio sea llamado una vez.
     */

    @Test
    void CrearProducto() throws Exception {
        Producto producto = new Producto();
        producto.setCodigoIdentificacion("P12345");
        producto.setNombre("Camiseta");

        when(productoService.agregarProducto(any(Producto.class))).thenReturn(producto);

        mockMvc.perform(post("/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigo\":\"P12345\",\"nombre\":\"Camiseta\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigoIdentificacion").value("P12345"))
                .andExpect(jsonPath("$.nombre").value("Camiseta"));

        verify(productoService, times(1)).agregarProducto(any(Producto.class));
    }

    /**
     * Prueba unitaria para el endpoint GET /productos/codigo/{codigo}.

     * Pasos:
     * 1. Se crea un objeto `Producto` con datos de prueba.
     * 2. Se configura el mock del servicio para devolver una lista con el producto.
     * 3. Se realiza una solicitud GET al endpoint `/productos/codigo/{codigo}`.
     * 4. Se verifica que el estado de la respuesta sea 200 (OK).
     * 5. Se valida que el JSON de la respuesta contenga los datos del producto.
     * 6. Se asegura que el método `obtenerProductosPorCodigo` del servicio sea llamado una vez.
     */
    @Test
    void ObtenerProductoPorCodigo() throws Exception {
        String codigo = "P12345";
        Producto producto = new Producto();
        producto.setCodigoIdentificacion(codigo);
        producto.setNombre("Camiseta");

        when(productoService.obtenerProductosPorCodigo(codigo)).thenReturn(List.of(producto));

        mockMvc.perform(get("/productos/codigo/{codigo}", codigo)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigoIdentificacion").value("P12345"))
                .andExpect(jsonPath("$[0].nombre").value("Camiseta"));

        verify(productoService, times(1)).obtenerProductosPorCodigo(codigo);
    }

    /**
     * Prueba unitaria para el manejo de productos no encontrados en el endpoint GET /productos/codigo/{codigo}.
     * 
     * Verifica que se devuelva un estado HTTP 404 (Not Found) cuando no se encuentran productos
     * para el código proporcionado.
     * 
     * Pasos:
     * 1. Se configura el mock del servicio para devolver una lista vacía.
     * 2. Se realiza una solicitud GET al endpoint `/productos/codigo/{codigo}`.
     * 3. Se verifica que el estado de la respuesta sea 404 (Not Found).
     * 4. Se asegura que el método `obtenerProductosPorCodigo` del servicio sea llamado una vez.
     */
    @Test
    void ManejoProductoNoEncontrado() throws Exception {
        String codigo = "P12345";
    
        when(productoService.obtenerProductosPorCodigo(codigo)).thenReturn(Collections.emptyList());
    
        mockMvc.perform(get("/productos/codigo/{codigo}", codigo)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    
        verify(productoService, times(1)).obtenerProductosPorCodigo(codigo);
    }
}