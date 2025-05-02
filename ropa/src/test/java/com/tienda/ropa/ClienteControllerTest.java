package com.tienda.ropa;

import com.tienda.ropa.controller.ClienteController;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.service.ClienteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClienteController.class)
class ClienteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClienteService clienteService;

    /**
     * Prueba unitaria para el endpoint POST /clientes.
     * 
     * Verifica que se pueda crear un cliente correctamente enviando una solicitud POST
     * con un cuerpo JSON.
     * 
     * Pasos:
     * 1. Se crea un objeto `Cliente` con datos de prueba.
     * 2. Se configura el mock del servicio para devolver el cliente creado.
     * 3. Se realiza una solicitud POST al endpoint `/clientes` con un cuerpo JSON.
     * 4. Se verifica que el estado de la respuesta sea 200 (OK).
     * 5. Se valida que el JSON de la respuesta contenga los datos del cliente.
     * 6. Se asegura que el método `agregarCliente` del servicio sea llamado una vez.
     */

    @Test
    void CrearCliente() throws Exception {
        Cliente cliente = new Cliente();
        cliente.setDni("12345678");
        cliente.setNombre("Juan Pérez");

        when(clienteService.agregarCliente(any(Cliente.class))).thenReturn(cliente);

        mockMvc.perform(post("/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dni\":\"12345678\",\"nombre\":\"Juan Pérez\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("12345678"))
                .andExpect(jsonPath("$.nombre").value("Juan Pérez"));

        verify(clienteService, times(1)).agregarCliente(any(Cliente.class));
    }

    /**
     * Prueba unitaria para el endpoint GET /clientes/{dni}.
     * 
     * Verifica que se pueda obtener un cliente por su DNI enviando una solicitud GET.
     * 
     * Pasos:
     * 1. Se crea un objeto `Cliente` con datos de prueba.
     * 2. Se configura el mock del servicio para devolver el cliente correspondiente al DNI.
     * 3. Se realiza una solicitud GET al endpoint `/clientes/{dni}`.
     * 4. Se verifica que el estado de la respuesta sea 200 (OK).
     * 5. Se valida que el JSON de la respuesta contenga los datos del cliente.
     * 6. Se asegura que el método `obtenerClientePorDni` del servicio sea llamado una vez.
     */

    @Test
    void ObtenerClientePorDni() throws Exception {
        String dni = "12345678";
        Cliente cliente = new Cliente();
        cliente.setDni(dni);
        cliente.setNombre("Juan Pérez");

        when(clienteService.obtenerClientePorDni(dni)).thenReturn(Optional.of(cliente));

        mockMvc.perform(get("/clientes/{dni}", dni)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("12345678"))
                .andExpect(jsonPath("$.nombre").value("Juan Pérez"));

        verify(clienteService, times(1)).obtenerClientePorDni(dni);
    }
}