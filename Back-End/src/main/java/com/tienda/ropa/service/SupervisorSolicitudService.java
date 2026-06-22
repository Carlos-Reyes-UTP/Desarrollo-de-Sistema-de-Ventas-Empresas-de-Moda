package com.tienda.ropa.service;

import com.tienda.ropa.dto.SupervisorHistorialSolicitudDTO;

import java.time.LocalDate;
import java.util.List;

public interface SupervisorSolicitudService {

    List<SupervisorHistorialSolicitudDTO> listarHistorial(LocalDate fecha, Long idArea, String tipoSolicitud);
}
