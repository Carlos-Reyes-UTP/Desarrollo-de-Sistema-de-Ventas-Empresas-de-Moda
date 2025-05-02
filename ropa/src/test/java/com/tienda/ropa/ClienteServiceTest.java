package com.tienda.ropa;

import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.repository.ClienteRepository;
import com.tienda.ropa.service.ClienteService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ClienteServiceTest {
    @Mock
    private ClienteRepository clienteRepository;

    @InjectMocks
    private ClienteService clienteService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    /**
     * Prueba unitaria para el método agregarCliente.
     * 
     * Verifica que se pueda agregar un cliente correctamente utilizando el repositorio.
     * 
     * Pasos:
     * 1. Se crea un objeto `Cliente` con datos de prueba.
     * 2. Se configura el mock del repositorio para devolver el cliente guardado.
     * 3. Se llama al método `agregarCliente` del servicio.
     * 4. Se valida que el cliente devuelto no sea nulo y que los datos coincidan.
     * 5. Se asegura que el método `save` del repositorio sea llamado una vez.
     */

    @Test
    void AgregarCliente() {
        Cliente cliente = new Cliente();
        cliente.setDni("12345678");
        cliente.setNombre("Juan Pérez");

        when(clienteRepository.save(cliente)).thenReturn(cliente);

        Cliente resultado = clienteService.agregarCliente(cliente);

        assertNotNull(resultado);
        assertEquals("12345678", resultado.getDni());
        assertEquals("Juan Pérez", resultado.getNombre());
        verify(clienteRepository, times(1)).save(cliente);
    }

    /**
     * Prueba unitaria para el método obtenerClientePorDni.
     * 
     * Verifica que se pueda obtener un cliente por su DNI utilizando el repositorio.
     * 
     * Pasos:
     * 1. Se crea un objeto `Cliente` con datos de prueba.
     * 2. Se configura el mock del repositorio para devolver un cliente opcional.
     * 3. Se llama al método `obtenerClientePorDni` del servicio.
     * 4. Se valida que el cliente devuelto esté presente y que los datos coincidan.
     * 5. Se asegura que el método `findByDni` del repositorio sea llamado una vez.
     */

    @Test
    void ObtenerClientePorDni() {
        String dni = "12345678";
        Cliente cliente = new Cliente();
        cliente.setDni(dni);
        cliente.setNombre("Juan Pérez");

        when(clienteRepository.findByDni(dni)).thenReturn(Optional.of(cliente));

        Optional<Cliente> resultado = clienteService.obtenerClientePorDni(dni);

        assertTrue(resultado.isPresent());
        assertEquals("12345678", resultado.get().getDni());
        assertEquals("Juan Pérez", resultado.get().getNombre());
        verify(clienteRepository, times(1)).findByDni(dni);
    }
}
