package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Talla;
import com.tienda.ropa.service.TallaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/almacenero/tallas")
@CrossOrigin(origins = "*")
public class TallaController {

    @Autowired
    private TallaService tallaService;

    @GetMapping
    public ResponseEntity<List<Talla>> getAllTallas() {
        return ResponseEntity.ok(tallaService.getAllTallas());
    }

    @GetMapping("/ordenadas")
    public ResponseEntity<List<Talla>> getTallasOrdenadas() {
        return ResponseEntity.ok(tallaService.getTallasOrdenadas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Talla> getTallaById(@PathVariable Long id) {
        return tallaService.getTallaById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Talla>> buscarTallas(@RequestParam String nombre) {
        return ResponseEntity.ok(tallaService.buscarTallas(nombre));
    }

    @PostMapping
    public ResponseEntity<?> createTalla(@Valid @RequestBody Talla talla) {
        try {
            Talla nuevaTalla = tallaService.createTalla(talla);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaTalla);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTalla(@PathVariable Long id, @Valid @RequestBody Talla talla) {
        try {
            Talla tallaActualizada = tallaService.updateTalla(id, talla);
            return ResponseEntity.ok(tallaActualizada);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTalla(@PathVariable Long id) {
        try {
            tallaService.deleteTalla(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }
} 