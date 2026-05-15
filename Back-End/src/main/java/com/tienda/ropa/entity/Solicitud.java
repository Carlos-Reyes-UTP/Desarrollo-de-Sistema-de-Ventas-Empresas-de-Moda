package com.tienda.ropa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "solicitud")
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud")
    private Long idSolicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = true)
    private Usuario usuario;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_solicitud", nullable = false, length = 32)
    private TipoSolicitud tipoSolicitud;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 32)
    private EstadoSolicitud estado;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_ubicacion_origen", nullable = false)
    private Ubicacion ubicacionOrigen;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_ubicacion_destino", nullable = false)
    private Ubicacion ubicacionDestino;

    @NotNull
    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_rechazo", length = 64)
    private MotivoRechazoSolicitud motivoRechazo;

    @OneToMany(mappedBy = "solicitud", fetch = FetchType.LAZY)
    private List<DetalleSolicitud> detalles = new ArrayList<>();
}
