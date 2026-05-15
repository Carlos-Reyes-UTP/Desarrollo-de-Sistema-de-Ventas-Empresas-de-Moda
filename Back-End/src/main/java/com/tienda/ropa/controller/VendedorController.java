package com.tienda.ropa.controller;

import com.tienda.ropa.dto.VendedorCatalogoBusquedaDTO;
import com.tienda.ropa.dto.VendedorCatalogoPorCodigoDTO;
import com.tienda.ropa.dto.VendedorCrearSolicitudRequest;
import com.tienda.ropa.dto.VendedorSolicitudResumenDTO;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.service.VendedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendedor")
@RequiredArgsConstructor
public class VendedorController {

    private static final ZoneId ZONA_OPERACION = ZoneId.of("America/Lima");

    private final VendedorService vendedorService;

    @GetMapping("/catalogo-por-codigo/{codigo}")
    public VendedorCatalogoBusquedaDTO catalogoPorCodigo(@PathVariable String codigo) {
        return vendedorService.buscarCatalogo(codigo);
    }

    @GetMapping("/catalogo-por-producto/{idProducto}")
    public VendedorCatalogoPorCodigoDTO catalogoPorProducto(@PathVariable Long idProducto) {
        return vendedorService.catalogoPorProductoId(idProducto);
    }

    @GetMapping("/catalogo-por-variante/{idVariante}")
    public VendedorCatalogoPorCodigoDTO catalogoPorVariante(@PathVariable Long idVariante) {
        return vendedorService.catalogoPorVarianteId(idVariante);
    }

    @GetMapping("/catalogo")
    public VendedorCatalogoBusquedaDTO catalogoPorQuery(@RequestParam("termino") String termino) {
        return vendedorService.buscarCatalogo(termino);
    }

    @PostMapping("/solicitudes")
    public ResponseEntity<Map<String, Long>> crearSolicitud(
            @RequestBody VendedorCrearSolicitudRequest body,
            @AuthenticationPrincipal Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Solicitud guardada = vendedorService.crearSolicitud(body, usuario.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("idSolicitud", guardada.getIdSolicitud()));
    }

    @GetMapping("/solicitudes/mias")
    public List<VendedorSolicitudResumenDTO> misSolicitudes(
            @AuthenticationPrincipal Usuario usuario,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        if (usuario == null || usuario.getId() == null) {
            return List.of();
        }
        Instant desdeEfectivo = desde;
        Instant hastaEfectivo = hasta;
        if (desdeEfectivo == null || hastaEfectivo == null) {
            ZonedDateTime ahora = ZonedDateTime.now(ZONA_OPERACION);
            if (desdeEfectivo == null) {
                desdeEfectivo = ahora.toLocalDate().atStartOfDay(ZONA_OPERACION).toInstant();
            }
            if (hastaEfectivo == null) {
                hastaEfectivo = ahora.toLocalDate().plusDays(1).atStartOfDay(ZONA_OPERACION).toInstant();
            }
        }
        return vendedorService.listarMisSolicitudes(usuario.getId(), desdeEfectivo, hastaEfectivo);
    }
}
