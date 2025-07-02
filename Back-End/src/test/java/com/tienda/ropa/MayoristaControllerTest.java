package com.tienda.ropa;

import com.tienda.ropa.controller.MayoristaController;
import com.tienda.ropa.dto.MayoristaDTO;
import com.tienda.ropa.service.MayoristaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MayoristaController.class)
class MayoristaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MayoristaService mayoristaService;

    @Test
    void deberiaObtenerMayoristaPorId() throws Exception {
        Long id = 1L;
        MayoristaDTO mayorista = new MayoristaDTO();
        mayorista.setIdCliente(id);
        mayorista.setCodigoMayorista("CAR-12345");
        mayorista.setNombreCliente("Carlos Alberto Ramirez");
        mayorista.setTipoCliente("DNI");
        mayorista.setNumeroDocumento("12345678");

        when(mayoristaService.obtenerMayoristaPorId(id)).thenReturn(Optional.of(mayorista));

        mockMvc.perform(get("/api/admin/mayoristas/{id}", id)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCliente").value(1L))
                .andExpect(jsonPath("$.codigoMayorista").value("CAR-12345"))
                .andExpect(jsonPath("$.nombreCliente").value("Carlos Alberto Ramirez"));

        verify(mayoristaService, times(1)).obtenerMayoristaPorId(id);
    }

    @Test
    void deberiaObtenerMayoristaPorCodigo() throws Exception {
        String codigo = "CAR-12345";
        MayoristaDTO mayorista = new MayoristaDTO();
        mayorista.setIdCliente(1L);
        mayorista.setCodigoMayorista(codigo);
        mayorista.setNombreCliente("Carlos Alberto Ramirez");

        when(mayoristaService.obtenerMayoristaPorCodigo(codigo)).thenReturn(Optional.of(mayorista));

        mockMvc.perform(get("/api/admin/mayoristas/codigo/{codigo}", codigo)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigoMayorista").value(codigo))
                .andExpect(jsonPath("$.nombreCliente").value("Carlos Alberto Ramirez"));

        verify(mayoristaService, times(1)).obtenerMayoristaPorCodigo(codigo);
    }

    @Test
    void deberiaCrearMayoristaDeCliente() throws Exception {
        Long idCliente = 1L;
        MayoristaDTO mayorista = new MayoristaDTO();
        mayorista.setIdCliente(idCliente);
        mayorista.setCodigoMayorista("CAR-12345");

        when(mayoristaService.crearMayorista(idCliente)).thenReturn(mayorista);

        mockMvc.perform(post("/api/admin/mayoristas/cliente/{idCliente}", idCliente)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCliente").value(idCliente))
                .andExpect(jsonPath("$.codigoMayorista").value("CAR-12345"));

        verify(mayoristaService, times(1)).crearMayorista(idCliente);
    }

    @Test
    void deberiaRetornar404CuandoMayoristaNoExiste() throws Exception {
        Long id = 999L;

        when(mayoristaService.obtenerMayoristaPorId(id)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/mayoristas/{id}", id)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(mayoristaService, times(1)).obtenerMayoristaPorId(id);
    }
}
