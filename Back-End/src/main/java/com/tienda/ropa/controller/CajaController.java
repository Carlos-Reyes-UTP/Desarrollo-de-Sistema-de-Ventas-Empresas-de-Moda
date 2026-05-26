package com.tienda.ropa.controller;

import com.tienda.ropa.dto.*;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.service.CajaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/caja")
public class CajaController {

    @Autowired
    private CajaService cajaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostMapping("/abrir")
    public ResponseEntity<CajaDTO> abrirCaja(
            Principal principal,
            @RequestBody AperturaCajaDTO aperturaDTO) {
        
        Usuario usuario = usuarioRepository.findByUsuario(principal.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        Long uid = usuario.getId();
        CajaDTO cajaDTO = cajaService.abrirCaja(uid, aperturaDTO);
        return ResponseEntity.ok(cajaDTO);
    }

    @PostMapping("/cerrar/{idCaja}")
    public ResponseEntity<CajaDTO> cerrarCaja(
            Principal principal,
            @PathVariable Long idCaja,
            @RequestBody CierreCajaDTO cierreDTO) {

        Usuario usuario = usuarioRepository.findByUsuario(principal.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        CajaDTO cajaDTO = cajaService.cerrarCaja(idCaja, usuario.getId(), cierreDTO);
        return ResponseEntity.ok(cajaDTO);
    }

    @GetMapping("/abierta")
    public ResponseEntity<CajaDTO> obtenerCajaAbierta(
            Principal principal) {
        
        Usuario usuario = usuarioRepository.findByUsuario(principal.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        Long uid = usuario.getId();
        // 204 = sin caja abierta (estado normal al iniciar turno), no usar 404 para no confundir con ruta inexistente
        return cajaService.obtenerCajaAbierta(uid)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{idCaja}")
    public ResponseEntity<CajaDTO> obtenerCajaPorId(@PathVariable Long idCaja) {
        return cajaService.obtenerCajaPorId(idCaja)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/historial")
    public ResponseEntity<List<CajaDTO>> obtenerHistorial(
            Principal principal) {
        
        Usuario usuario = usuarioRepository.findByUsuario(principal.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        Long uid = usuario.getId();
        List<CajaDTO> historial = cajaService.obtenerHistorialCajas(uid);
        return ResponseEntity.ok(historial);
    }

    @GetMapping("/todos")
    public ResponseEntity<List<CajaDTO>> obtenerTodasCajas() {
        List<CajaDTO> cajas = cajaService.obtenerTodasCajas();
        return ResponseEntity.ok(cajas);
    }

    @GetMapping("/movimientos/{idCaja}")
    public ResponseEntity<List<MovimientoCajaDTO>> obtenerMovimientos(@PathVariable Long idCaja) {
        List<MovimientoCajaDTO> movimientos = cajaService.obtenerMovimientos(idCaja);
        return ResponseEntity.ok(movimientos);
    }
}