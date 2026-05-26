package com.tienda.ropa.service;

import com.tienda.ropa.dto.SolicitudAccionResponseDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.DetalleSolicitud;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.MotivoRechazoSolicitud;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.repository.SolicitudRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UsuarioRepository;
import com.tienda.ropa.service.impl.SolicitudServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SolicitudServiceImplTest {

    @Mock
    private SolicitudRepository solicitudRepository;
    @Mock
    private DetalleSolicitudRepository detalleSolicitudRepository;
    @Mock
    private UbicacionAreaRepository ubicacionAreaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private ProductoVarianteRepository productoVarianteRepository;
    @Mock
    private TrasladoInventarioService trasladoInventarioService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private InventarioContextService inventarioContextService;
    @Mock
    private InventarioService inventarioService;

    @InjectMocks
    private SolicitudServiceImpl service;

    private Solicitud solicitudPendiente;
    private UbicacionArea origen;
    private UbicacionArea destino;
    private Usuario almaceneroAdmin;

    @BeforeEach
    void setUp() {
        Area area = new Area();
        area.setIdArea(10L);
        area.setNombre("Damas");

        Ubicacion piso = new Ubicacion();
        piso.setIdUbicacion(1L);
        piso.setNombre("Piso 1");

        origen = new UbicacionArea();
        origen.setIdUbicacionArea(100L);
        origen.setUbicacion(piso);
        origen.setArea(area);

        destino = new UbicacionArea();
        destino.setIdUbicacionArea(101L);
        destino.setUbicacion(piso);
        destino.setArea(area);

        solicitudPendiente = new Solicitud();
        solicitudPendiente.setIdSolicitud(15L);
        solicitudPendiente.setEstado(EstadoSolicitud.PENDIENTE);
        solicitudPendiente.setUbicacionAreaOrigen(origen);
        solicitudPendiente.setUbicacionAreaDestino(destino);

        almaceneroAdmin = new Usuario();
        almaceneroAdmin.setId(2L);
        almaceneroAdmin.setUsuario("almacenero 2");
    }

    @Test
    void atenderSolicitud_devuelveDtoAtendidoSinEntidadCompleta() {
        ProductoVariante variante = new ProductoVariante();
        variante.setIdProductoVariante(50L);

        DetalleSolicitud detalle = new DetalleSolicitud();
        detalle.setCantidad(2);
        detalle.setVariante(variante);

        when(solicitudRepository.findByIdWithUbicaciones(15L)).thenReturn(Optional.of(solicitudPendiente));
        when(detalleSolicitudRepository.findBySolicitud_IdSolicitud(15L)).thenReturn(List.of(detalle));
        when(inventarioService.stockEnUbicacionArea(50L, 100L)).thenReturn(10);
        when(solicitudRepository.save(any(Solicitud.class))).thenAnswer(inv -> {
            Solicitud saved = inv.getArgument(0);
            saved.setEstado(EstadoSolicitud.ATENDIDO);
            return saved;
        });

        SolicitudAccionResponseDTO resultado = service.atenderSolicitud(15L, almaceneroAdmin);

        assertThat(resultado.idSolicitud()).isEqualTo(15L);
        assertThat(resultado.estado()).isEqualTo("ATENDIDO");
        assertThat(resultado.motivoRechazo()).isNull();
        verify(notificationService).sendNotificationObject(any());
    }

    @Test
    void atenderSolicitud_sinStockDevuelveDtoCancelado() {
        ProductoVariante variante = new ProductoVariante();
        variante.setIdProductoVariante(50L);

        DetalleSolicitud detalle = new DetalleSolicitud();
        detalle.setCantidad(5);
        detalle.setVariante(variante);

        when(solicitudRepository.findByIdWithUbicaciones(15L)).thenReturn(Optional.of(solicitudPendiente));
        when(detalleSolicitudRepository.findBySolicitud_IdSolicitud(15L)).thenReturn(List.of(detalle));
        when(inventarioService.stockEnUbicacionArea(50L, 100L)).thenReturn(1);
        when(solicitudRepository.save(any(Solicitud.class))).thenAnswer(inv -> inv.getArgument(0));

        SolicitudAccionResponseDTO resultado = service.atenderSolicitud(15L, almaceneroAdmin);

        assertThat(resultado.estado()).isEqualTo("CANCELADO");
        assertThat(resultado.motivoRechazo()).isEqualTo("SIN_STOCK_FISICO");
        verify(notificationService).sendNotificationObject(eq(java.util.Map.of(
                "type", "SOLICITUD_RECHAZADA",
                "idSolicitud", 15L)));
    }
}
