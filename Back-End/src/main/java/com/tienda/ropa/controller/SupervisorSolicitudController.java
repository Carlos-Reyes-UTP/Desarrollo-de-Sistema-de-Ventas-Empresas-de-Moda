package com.tienda.ropa.controller;

import com.tienda.ropa.dto.SupervisorHistorialSolicitudDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.repository.AreaRepository;
import com.tienda.ropa.service.SupervisorSolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/supervisor/solicitudes")
@RequiredArgsConstructor
public class SupervisorSolicitudController {

    private final SupervisorSolicitudService supervisorSolicitudService;
    private final AreaRepository areaRepository;

    @GetMapping("/historial")
    public List<SupervisorHistorialSolicitudDTO> historial(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) String tipo) {
        return supervisorSolicitudService.listarHistorial(fecha, areaId, tipo);
    }

    @GetMapping("/areas")
    public List<Area> listarAreas() {
        return areaRepository.findAllByActivoTrueOrderByNombreAsc();
    }
}
