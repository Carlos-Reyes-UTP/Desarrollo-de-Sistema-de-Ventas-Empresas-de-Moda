package com.tienda.ropa.controller;

import com.tienda.ropa.dto.ActivoRequest;
import com.tienda.ropa.dto.AreaCatalogoDTO;
import com.tienda.ropa.dto.CrearUbicacionOperativaRequest;
import com.tienda.ropa.dto.NombreEstructuraRequest;
import com.tienda.ropa.dto.PisoDTO;
import com.tienda.ropa.dto.UbicacionOperativaDTO;
import com.tienda.ropa.dto.UbicacionesResumenDTO;
import com.tienda.ropa.service.GerenteEstructuraAlmacenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/gerente/estructura-almacen")
@RequiredArgsConstructor
public class GerenteEstructuraAlmacenController {

    private final GerenteEstructuraAlmacenService gerenteEstructuraAlmacenService;

    @GetMapping("/pisos")
    public List<PisoDTO> listarPisos(
            @RequestParam(defaultValue = "false") boolean incluirInactivos,
            @RequestParam(defaultValue = "true") boolean incluirReservados) {
        return gerenteEstructuraAlmacenService.listarPisos(incluirInactivos, incluirReservados);
    }

    @PostMapping("/pisos")
    @ResponseStatus(HttpStatus.CREATED)
    public PisoDTO crearPiso(@RequestBody @Valid NombreEstructuraRequest request) {
        return gerenteEstructuraAlmacenService.crearPiso(request);
    }

    @PatchMapping("/pisos/{id}")
    public PisoDTO actualizarPiso(
            @PathVariable Long id,
            @RequestBody @Valid NombreEstructuraRequest request) {
        return gerenteEstructuraAlmacenService.actualizarPiso(id, request);
    }

    @PatchMapping("/pisos/{id}/activo")
    public PisoDTO cambiarActivoPiso(
            @PathVariable Long id,
            @RequestBody @Valid ActivoRequest request) {
        return gerenteEstructuraAlmacenService.cambiarActivoPiso(id, request);
    }

    @GetMapping("/areas")
    public List<AreaCatalogoDTO> listarAreas(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return gerenteEstructuraAlmacenService.listarAreas(incluirInactivos);
    }

    @PostMapping("/areas")
    @ResponseStatus(HttpStatus.CREATED)
    public AreaCatalogoDTO crearArea(@RequestBody @Valid NombreEstructuraRequest request) {
        return gerenteEstructuraAlmacenService.crearArea(request);
    }

    @PatchMapping("/areas/{id}")
    public AreaCatalogoDTO actualizarArea(
            @PathVariable Long id,
            @RequestBody @Valid NombreEstructuraRequest request) {
        return gerenteEstructuraAlmacenService.actualizarArea(id, request);
    }

    @PatchMapping("/areas/{id}/activo")
    public AreaCatalogoDTO cambiarActivoArea(
            @PathVariable Long id,
            @RequestBody @Valid ActivoRequest request) {
        return gerenteEstructuraAlmacenService.cambiarActivoArea(id, request);
    }

    @GetMapping("/ubicaciones")
    public List<UbicacionOperativaDTO> listarUbicaciones(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return gerenteEstructuraAlmacenService.listarUbicaciones(incluirInactivos);
    }

    @GetMapping("/ubicaciones/resumen")
    public UbicacionesResumenDTO listarUbicacionesResumen(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return gerenteEstructuraAlmacenService.listarUbicacionesResumen(incluirInactivos);
    }

    @PostMapping("/ubicaciones")
    @ResponseStatus(HttpStatus.CREATED)
    public UbicacionOperativaDTO crearUbicacion(@RequestBody @Valid CrearUbicacionOperativaRequest request) {
        return gerenteEstructuraAlmacenService.crearUbicacion(request);
    }

    @PatchMapping("/ubicaciones/{id}/activo")
    public UbicacionOperativaDTO cambiarActivoUbicacion(
            @PathVariable Long id,
            @RequestBody @Valid ActivoRequest request) {
        return gerenteEstructuraAlmacenService.cambiarActivoUbicacion(id, request);
    }
}
