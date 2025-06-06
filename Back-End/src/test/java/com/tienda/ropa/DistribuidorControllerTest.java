package com.tienda.ropa;

import com.tienda.ropa.controller.DistribuidorController;
import com.tienda.ropa.entity.Distribuidor;
import com.tienda.ropa.service.DistribuidorService;
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

@WebMvcTest(DistribuidorController.class)
public class DistribuidorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DistribuidorService distribuidorService;
    @Test
    void deberiaObtenerDistribuidorPorId() throws Exception {
        Long id = 123L;
        Distribuidor distribuidor = new Distribuidor();
        distribuidor.setIdDistribuidor(id);
        distribuidor.setNombre("Distribuidor ABC");
    
        when(distribuidorService.obtenerDistribuidorPorId(id)).thenReturn(Optional.of(distribuidor));
    
        mockMvc.perform(get("/distribuidores/{id}", id)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idDistribuidor").value(123L))
                .andExpect(jsonPath("$.nombre").value("Distribuidor ABC"));
    
        verify(distribuidorService, times(1)).obtenerDistribuidorPorId(id);
    }
}