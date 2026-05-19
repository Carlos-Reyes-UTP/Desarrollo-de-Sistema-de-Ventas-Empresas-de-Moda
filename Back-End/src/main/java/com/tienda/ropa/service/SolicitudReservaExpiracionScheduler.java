package com.tienda.ropa.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.repository.SolicitudRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Libera reservas blandas cancelando solicitudes VENTA PENDIENTE expiradas.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SolicitudReservaExpiracionScheduler {

    private final SolicitudRepository solicitudRepository;

    @Value("${solicitud.reserva.ttl-minutos:90}")
    private int ttlMinutos;

    @Scheduled(fixedDelayString = "${solicitud.reserva.expiracion-intervalo-ms:300000}")
    @Transactional
    public void expirarReservasPendientes() {
        if (ttlMinutos <= 0) {
            return;
        }
        Instant limite = Instant.now().minus(ttlMinutos, ChronoUnit.MINUTES);
        List<Solicitud> expiradas = solicitudRepository.findByEstadoAndTipoSolicitudAndFechaCreacionBefore(
                EstadoSolicitud.PENDIENTE, TipoSolicitud.VENTA, limite);
        if (expiradas.isEmpty()) {
            return;
        }
        for (Solicitud s : expiradas) {
            s.setEstado(EstadoSolicitud.CANCELADO);
            s.setMotivoRechazo(null);
        }
        solicitudRepository.saveAll(expiradas);
        log.info("Expiradas {} solicitudes VENTA PENDIENTE (TTL {} min)", expiradas.size(), ttlMinutos);
    }
}
