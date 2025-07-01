package com.tienda.ropa.controller;

import java.util.List;

import com.tienda.ropa.service.ApiExternoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.ReniecResponseDTO;
import com.tienda.ropa.dto.SunatResponseDTO;
import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.service.ClienteService;

@RestController
@RequestMapping("/api/cajero/clientes")
public class ClienteController {

    @Autowired
    private ClienteService clienteService;
    
    @Autowired
    private ApiExternoService apiExternoService;

    @GetMapping
    public List<Cliente> getAllClientes() {
        return clienteService.getAllClientes();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Cliente> getClienteById(@PathVariable Long id) {
        return clienteService.getClienteById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    /**
     * Endpoint general que se mantiene por compatibilidad con código existente
     */
    @GetMapping("/documento/{numero}")
    public ResponseEntity<Cliente> getClienteByDocumento(@PathVariable String numero) {
        return clienteService.getClienteByNumeroDocumento(numero)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    /**
     * Nuevo endpoint específico para consulta de DNI
     * Si no existe el cliente, consulta a RENIEC y lo guarda en la BD
     */
    @GetMapping("/documento/dni/{numero}")
    public ResponseEntity<Cliente> getClienteByDni(@PathVariable String numero) {
        return clienteService.getClienteByDni(numero)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Nuevo endpoint específico para consulta de RUC
     * Si no existe el cliente, consulta a SUNAT y lo guarda en la BD
     */
    @GetMapping("/documento/ruc/{numero}")
    public ResponseEntity<Cliente> getClienteByRuc(@PathVariable String numero) {
        return clienteService.getClienteByRuc(numero)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Cliente createCliente(@RequestBody Cliente cliente) {
        return clienteService.saveCliente(cliente);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Cliente> updateCliente(@PathVariable Long id, @RequestBody Cliente cliente) {
        return clienteService.getClienteById(id)
                .map(clienteExistente -> {
                    cliente.setIdCliente(id);
                    return ResponseEntity.ok(clienteService.saveCliente(cliente));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCliente(@PathVariable Long id) {
        return clienteService.getClienteById(id)
                .map(cliente -> {
                    clienteService.deleteCliente(id);
                    return ResponseEntity.ok().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}