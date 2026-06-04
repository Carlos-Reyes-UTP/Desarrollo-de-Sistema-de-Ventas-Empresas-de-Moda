package com.tienda.ropa.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tienda.ropa.dto.AlertaReposicionDTO;
import com.tienda.ropa.dto.ReponerAlertaRequest;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.AlertaReposicionService;
import com.tienda.ropa.service.DashboardService;

@RestController
@RequestMapping("/api/almacenero/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private AlertaReposicionService alertaReposicionService;

    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticasGenerales(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String sector) {
        return ResponseEntity.ok(dashboardService.obtenerEstadisticasGenerales(usuario, sector));
    }

    @GetMapping("/distribucion-categorias")
    public ResponseEntity<List<Map<String, Object>>> obtenerDistribucionCategorias(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String sector) {
        return ResponseEntity.ok(dashboardService.obtenerDistribucionCategorias(usuario, sector));
    }

    @GetMapping("/estado-inventario")
    public ResponseEntity<Map<String, Object>> obtenerEstadoInventario(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String sector) {
        return ResponseEntity.ok(dashboardService.obtenerEstadoInventario(usuario, sector));
    }

    @GetMapping("/alertas-reposicion")
    public ResponseEntity<List<AlertaReposicionDTO>> obtenerAlertasReposicion(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) String sector) {
        return ResponseEntity.ok(alertaReposicionService.obtenerAlertas(usuario, sector));
    }

    @PostMapping("/alertas-reposicion/{idVariante}/{idUbicacionArea}/reponer")
    public ResponseEntity<Solicitud> reponer(
            @PathVariable Long idVariante,
            @PathVariable Long idUbicacionArea,
            @RequestBody(required = false) ReponerAlertaRequest body,
            @AuthenticationPrincipal Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Integer cantidad = body != null ? body.cantidad() : null;
        Solicitud solicitud = alertaReposicionService.reponer(
                idVariante, idUbicacionArea, usuario.getId(), cantidad);
        return ResponseEntity.status(HttpStatus.CREATED).body(solicitud);
    }
}
