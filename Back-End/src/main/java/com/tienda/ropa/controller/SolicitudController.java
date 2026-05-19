package com.tienda.ropa.controller;

import com.tienda.ropa.dto.AlmacenAtenderLoteRequest;
import com.tienda.ropa.dto.AlmacenRechazarSolicitudRequest;
import com.tienda.ropa.dto.AlmacenSolicitudCardDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.SolicitudService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/almacenero/solicitudes")
@RequiredArgsConstructor
public class SolicitudController {

    private final SolicitudService solicitudService;

    @GetMapping
    public List<Solicitud> listar() {
        return solicitudService.listar();
    }

    @GetMapping("/cola")
    public List<AlmacenSolicitudCardDTO> colaPendientes(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String sector) {
        return solicitudService.listarColaPendientes(usuario, sector);
    }

    @PostMapping
    public ResponseEntity<Solicitud> crear(
            @RequestBody CrearSolicitudDTO dto,
            @AuthenticationPrincipal Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitudService.crear(dto, usuario.getId()));
    }

    @PostMapping("/sistema")
    public ResponseEntity<Solicitud> crearSistema(@RequestBody CrearSolicitudDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitudService.crearSistema(dto));
    }

    @PatchMapping("/{id}/estado")
    public Solicitud cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        return solicitudService.cambiarEstado(id, estado);
    }

    @PostMapping("/{id}/atender")
    public Solicitud atender(
            @PathVariable Long id,
            @AuthenticationPrincipal Usuario usuario) {
        return solicitudService.atenderSolicitud(id, usuario);
    }

    /** Despacha un lote completo en una sola operación (evita llamadas duplicadas desde el front). */
    @PostMapping("/atender-lote")
    public ResponseEntity<Void> atenderLote(
            @RequestBody AlmacenAtenderLoteRequest body,
            @AuthenticationPrincipal Usuario usuario) {
        solicitudService.atenderSolicitudesLote(body.idsSolicitud(), usuario);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/rechazar")
    public Solicitud rechazar(
            @PathVariable Long id,
            @Valid @RequestBody AlmacenRechazarSolicitudRequest body,
            @AuthenticationPrincipal Usuario usuario) {
        MotivoRechazoSolicitud motivo = MotivoRechazoSolicitud.valueOf(body.motivo().trim().toUpperCase());
        return solicitudService.rechazarSolicitud(id, motivo, usuario);
    }
}
