package com.tienda.ropa.dto;

import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.Solicitud;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SolicitudAccionResponseDTOTest {

    @Test
    void from_mapeaSolicitudAtendidaSinTocarAsociacionesLazy() {
        Solicitud solicitud = new Solicitud();
        solicitud.setIdSolicitud(15L);
        solicitud.setEstado(EstadoSolicitud.ATENDIDO);
        solicitud.setMotivoRechazo(null);

        SolicitudAccionResponseDTO dto = SolicitudAccionResponseDTO.from(solicitud);

        assertThat(dto.idSolicitud()).isEqualTo(15L);
        assertThat(dto.estado()).isEqualTo("ATENDIDO");
        assertThat(dto.motivoRechazo()).isNull();
    }

    @Test
    void from_mapeaSolicitudRechazadaConMotivo() {
        Solicitud solicitud = new Solicitud();
        solicitud.setIdSolicitud(16L);
        solicitud.setEstado(EstadoSolicitud.CANCELADO);
        solicitud.setMotivoRechazo(MotivoRechazoSolicitud.SIN_STOCK_FISICO);

        SolicitudAccionResponseDTO dto = SolicitudAccionResponseDTO.from(solicitud);

        assertThat(dto.idSolicitud()).isEqualTo(16L);
        assertThat(dto.estado()).isEqualTo("CANCELADO");
        assertThat(dto.motivoRechazo()).isEqualTo("SIN_STOCK_FISICO");
    }

    @Test
    void from_nullDevuelveNull() {
        assertThat(SolicitudAccionResponseDTO.from(null)).isNull();
    }
}
