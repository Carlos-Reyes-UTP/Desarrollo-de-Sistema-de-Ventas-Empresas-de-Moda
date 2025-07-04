package com.tienda.ropa.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.entity.Cliente;
import com.tienda.ropa.service.ApiExternoService;
import com.tienda.ropa.service.ClienteService;
import com.tienda.ropa.service.MayoristaService;

@RestController
@RequestMapping("/api/cajero/clientes")
public class ClienteController {

    private final ClienteService clienteService;
    private final ApiExternoService apiExternoService;
    private final MayoristaService mayoristaService;

    public ClienteController(ClienteService clienteService, 
                           ApiExternoService apiExternoService,
                           MayoristaService mayoristaService) {
        this.clienteService = clienteService;
        this.apiExternoService = apiExternoService;
        this.mayoristaService = mayoristaService;
    }

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
    public ResponseEntity<Object> deleteCliente(@PathVariable Long id) {
        return clienteService.getClienteById(id)
                .map(cliente -> {
                    clienteService.deleteCliente(id);
                    return ResponseEntity.ok().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    /**
     * Endpoint para verificar si un cliente es mayorista por documento
     * Permite a los cajeros verificar el estado sin acceso completo a admin endpoints
     */
    @GetMapping("/documento/{numeroDocumento}/es-mayorista")
    public ResponseEntity<Map<String, Object>> verificarClienteEsMayorista(@PathVariable String numeroDocumento) {
        return clienteService.getClienteByNumeroDocumento(numeroDocumento)
                .map(cliente -> {
                    // Verificar si existe un mayorista para este cliente
                    boolean esMayorista = mayoristaService.obtenerMayoristaPorDocumento(numeroDocumento).isPresent();
                    
                    Map<String, Object> respuesta = new HashMap<>();
                    respuesta.put("numeroDocumento", numeroDocumento);
                    respuesta.put("esMayorista", esMayorista);
                    respuesta.put("nombreCliente", cliente.getNombreCliente());
                    respuesta.put("tipoCliente", cliente.getTipoCliente());
                    
                    return ResponseEntity.ok(respuesta);
                })
                .orElseGet(() -> {
                    Map<String, Object> respuesta = new HashMap<>();
                    respuesta.put("numeroDocumento", numeroDocumento);
                    respuesta.put("esMayorista", false);
                    respuesta.put("clienteEncontrado", false);
                    return ResponseEntity.ok(respuesta);
                });
    }
}