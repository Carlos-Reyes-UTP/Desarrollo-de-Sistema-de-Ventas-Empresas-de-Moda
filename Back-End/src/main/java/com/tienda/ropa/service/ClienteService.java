package com.tienda.ropa.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tienda.ropa.dto.ReniecResponseDTO;
import com.tienda.ropa.dto.SunatResponseDTO;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.repository.ClienteRepository;

@Service
public class ClienteService {

    @Autowired
    private ClienteRepository clienteRepository;
    
    @Autowired
    private ApiExternoService apiExternoService;

    public List<Cliente> getAllClientes() {
        return clienteRepository.findAll();
    }
    
    public Optional<Cliente> getClienteById(Long id) {
        return clienteRepository.findById(id);
    }
    
    public Optional<Cliente> getClienteByNumeroDocumento(String numeroDocumento) {
        // Primero buscamos en la base de datos local
        Optional<Cliente> clienteOptional = clienteRepository.findByNumeroDocumento(numeroDocumento);

        return clienteOptional;
    }

    /**
     * Busca un cliente por DNI o lo consulta en RENIEC si no existe
     */
    public Optional<Cliente> getClienteByDni(String dni) {
        // Primero buscamos en la base de datos local
        Optional<Cliente> clienteOptional = clienteRepository.findByNumeroDocumento(dni);

        // Si no lo encontramos, consultamos a la API de RENIEC
        if (clienteOptional.isEmpty()) {
            try {
                // Usamos block() para convertir el Mono a un objeto sincrónico (solo para este ejemplo)
                ReniecResponseDTO reniecResponse = apiExternoService.consultarDni(dni).block();

                if (reniecResponse != null) {
                    // Crear un nuevo cliente con los datos de RENIEC
                    Cliente nuevoCliente = apiExternoService.crearClienteDesdeReniec(reniecResponse);

                    // Devolvemos el cliente recién creado
                    return Optional.of(nuevoCliente);
                }
            } catch (Exception e) {
                // En caso de error, solo registramos y continuamos
                System.err.println("Error al consultar RENIEC: " + e.getMessage());
            }
        }

        return clienteOptional;
    }

    /**
     * Busca un cliente por RUC o lo consulta en SUNAT si no existe
     */
    public Optional<Cliente> getClienteByRuc(String ruc) {
        // Primero buscamos en la base de datos local
        Optional<Cliente> clienteOptional = clienteRepository.findByNumeroDocumento(ruc);

        // Si no lo encontramos, consultamos a la API de SUNAT
        if (clienteOptional.isEmpty()) {
            try {
                // Usamos block() para convertir el Mono a un objeto sincrónico
                SunatResponseDTO sunatResponse = apiExternoService.consultarRuc(ruc).block();

                if (sunatResponse != null) {
                    // Crear un nuevo cliente con los datos de SUNAT
                    Cliente nuevoCliente = apiExternoService.crearClienteDesdeSunat(sunatResponse);

                    // Devolvemos el cliente encontrado
                    return Optional.of(nuevoCliente);
                }
            } catch (Exception e) {
                // En caso de error, solo registramos y continuamos
                System.err.println("Error al consultar SUNAT: " + e.getMessage());
            }
        }

        return clienteOptional;
    }
    
    public Cliente saveCliente(Cliente cliente) {
        return clienteRepository.save(cliente);
    }
    
    public void deleteCliente(Long id) {
        clienteRepository.deleteById(id);
    }
}