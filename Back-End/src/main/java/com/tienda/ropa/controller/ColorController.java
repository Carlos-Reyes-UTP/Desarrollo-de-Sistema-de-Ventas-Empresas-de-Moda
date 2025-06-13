package com.tienda.ropa.controller;

import com.tienda.ropa.entity.Color;
import com.tienda.ropa.service.ColorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/almacenero/colores")
@CrossOrigin(origins = "*")
public class ColorController {

    @Autowired
    private ColorService colorService;

    @GetMapping
    public ResponseEntity<List<Color>> getAllColores() {
        return ResponseEntity.ok(colorService.getAllColores());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Color> getColorById(@PathVariable Long id) {
        return colorService.getColorById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Color>> buscarColores(@RequestParam String nombre) {
        return ResponseEntity.ok(colorService.buscarColores(nombre));
    }

    @PostMapping
    public ResponseEntity<Color> createColor(@RequestBody Color color) {
        return ResponseEntity.ok(colorService.createColor(color));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Color> updateColor(@PathVariable Long id, @RequestBody Color color) {
        try {
            return ResponseEntity.ok(colorService.updateColor(id, color));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColor(@PathVariable Long id) {
        try {
            colorService.deleteColor(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
} 