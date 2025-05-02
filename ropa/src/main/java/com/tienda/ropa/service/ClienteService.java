package com.tienda.ropa.service;

import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ClienteService {

    @Autowired
    private ClienteRepository clienteRepository;

    public Cliente agregarCliente(Cliente cliente) {
        return clienteRepository.save(cliente);
    }

    public Optional<Cliente> obtenerClientePorDni(String dni) {
        return clienteRepository.findByDni(dni);
    }
}