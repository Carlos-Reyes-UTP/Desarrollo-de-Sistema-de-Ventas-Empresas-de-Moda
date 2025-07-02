package com.tienda.ropa.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.MayoristaDTO;
import com.tienda.ropa.service.MayoristaService;

@RestController
@RequestMapping("/api/admin/mayoristas")
public class MayoristaController {

    private final MayoristaService mayoristaService;

    public MayoristaController(MayoristaService mayoristaService) {
        this.mayoristaService = mayoristaService;
    }

    /**
     * Obtiene todos los mayoristas
     */
    @GetMapping
    public List<MayoristaDTO> obtenerMayoristas() {
        return mayoristaService.obtenerMayoristas();
    }

    /**
     * Obtiene un mayorista por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<MayoristaDTO> obtenerMayoristaPorId(@PathVariable Long id) {
        return mayoristaService.obtenerMayoristaPorId(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Obtiene un mayorista por código
     */
    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<MayoristaDTO> obtenerMayoristaPorCodigo(@PathVariable String codigo) {
        return mayoristaService.obtenerMayoristaPorCodigo(codigo)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Obtiene un mayorista por número de documento del cliente
     */
    @GetMapping("/documento/{numeroDocumento}")
    public ResponseEntity<MayoristaDTO> obtenerMayoristaPorDocumento(@PathVariable String numeroDocumento) {
        return mayoristaService.obtenerMayoristaPorDocumento(numeroDocumento)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Crea un mayorista a partir de un cliente existente
     */
    @PostMapping("/cliente/{idCliente}")
    public ResponseEntity<MayoristaDTO> crearMayoristaDeCliente(@PathVariable Long idCliente) {
        try {
            MayoristaDTO mayorista = mayoristaService.crearMayorista(idCliente);
            return ResponseEntity.ok(mayorista);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Crea un mayorista completo (cliente + mayorista)
     */
    @PostMapping
    public ResponseEntity<MayoristaDTO> crearMayoristaCompleto(@RequestBody MayoristaDTO mayoristaDTO) {
        try {
            MayoristaDTO mayorista = mayoristaService.crearMayoristaCompleto(mayoristaDTO);
            return ResponseEntity.ok(mayorista);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Actualiza un mayorista
     */
    @PutMapping("/{id}")
    public ResponseEntity<MayoristaDTO> actualizarMayorista(@PathVariable Long id, @RequestBody MayoristaDTO mayoristaDTO) {
        try {
            MayoristaDTO mayorista = mayoristaService.actualizarMayorista(id, mayoristaDTO);
            return ResponseEntity.ok(mayorista);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Elimina un mayorista
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarMayorista(@PathVariable Long id) {
        boolean eliminado = mayoristaService.eliminarMayorista(id);
        if (eliminado) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
