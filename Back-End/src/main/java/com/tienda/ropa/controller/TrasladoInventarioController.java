package com.tienda.ropa.controller;

import com.tienda.ropa.dto.MovimientoHistorialDTO;
import com.tienda.ropa.dto.TrasladoInventarioDTO;
import com.tienda.ropa.dto.TrasladoMasivoDTO;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.MovimientoHistorialService;
import com.tienda.ropa.service.TrasladoInventarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

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
    private final MovimientoHistorialService movimientoHistorialService;

    @GetMapping("/historial")
    public ResponseEntity<Page<MovimientoHistorialDTO>> historial(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam int mes,
            @RequestParam int anio,
            @RequestParam(required = false) Long area,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<MovimientoHistorialDTO> result = movimientoHistorialService.getHistorialMes(mes, anio, area, fechaDesde, fechaHasta, pageable);
        return ResponseEntity.ok(result);
    }

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
