package com.tienda.ropa;

import com.tienda.ropa.controller.ProveedoresController; // se actualiza
import com.tienda.ropa.entity.Proveedores;
import com.tienda.ropa.service.ProveedoresService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProveedoresController.class) // se actualiza
public class ProveedoresControllerTest { // se cambió de DistribuidorControllerTest

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProveedoresService proveedoresService; // se actualiza

    @Test
    void deberiaObtenerProveedorPorId() throws Exception { // se actualiza nombre del método
        Long id = 123L;
        Proveedores proveedor = new Proveedores();
        proveedor.setIdProveedor(id);
        proveedor.setNombre("Proveedor ABC");
    
        when(proveedoresService.obtenerProveedorPorId(id)).thenReturn(Optional.of(proveedor));
    
        mockMvc.perform(get("/proveedores/{id}", id)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProveedor").value(123L))
                .andExpect(jsonPath("$.nombre").value("Proveedor ABC"));
    
        verify(proveedoresService, times(1)).obtenerProveedorPorId(id);
    }
}
