package com.tienda.ropa.controller;

import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.dto.TrasladoMasivoDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.TrasladoInventarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint para mover stock entre ubicaciones del almacén de forma inmediata.
 * Las solicitudes (tabla {@code solicitud}) se mantienen para los flujos de
 * pedido del vendedor y reposición automática.
 */
@RestController
@RequestMapping("/api/almacenero/inventario")
@RequiredArgsConstructor
public class TrasladoInventarioController {

    private final TrasladoInventarioService trasladoInventarioService;

    @PostMapping("/traslado")
    public ResponseEntity<Void> mover(
            @RequestBody TrasladoInventarioDTO dto,
            @AuthenticationPrincipal Usuario usuario) {
        trasladoInventarioService.mover(dto, usuario);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/traslado-masivo")
    public ResponseEntity<Void> moverMasivo(
            @RequestBody TrasladoMasivoDTO dto,
            @AuthenticationPrincipal Usuario usuario) {
        trasladoInventarioService.moverMasivo(dto, usuario);
        return ResponseEntity.noContent().build();
    }
}
