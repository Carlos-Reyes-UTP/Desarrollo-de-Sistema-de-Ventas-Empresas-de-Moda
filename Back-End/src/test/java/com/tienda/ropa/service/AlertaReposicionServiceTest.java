package com.tienda.ropa.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.tienda.ropa.dto.AlertaReposicionDTO;
import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;

@ExtendWith(MockitoExtension.class)
class AlertaReposicionServiceTest {

    @Mock
    private InventarioRepository inventarioRepository;
    @Mock
    private InventarioService inventarioService;
    @Mock
    private InventarioContextService inventarioContextService;
    @Mock
    private UbicacionAreaRepository ubicacionAreaRepository;
    @Mock
    private DetalleSolicitudRepository detalleSolicitudRepository;
    @Mock
    private SolicitudService solicitudService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AlertaReposicionService service;

    private UbicacionArea destinoPiso;
    private UbicacionArea almacenAsignado;
    private Inventario filaStockCero;
    private Usuario almacenero;
    private static final Long ID_VARIANTE = 50L;
    private static final Long ID_DESTINO = 200L;
    private static final Long ID_USUARIO = 9L;
    private static final Long ID_AREA_DAMAS = 10L;

    @BeforeEach
    void setUp() {
        Area area = new Area();
        area.setIdArea(ID_AREA_DAMAS);
        area.setNombre("Damas");

        Ubicacion piso = new Ubicacion();
        piso.setIdUbicacion(1L);
        piso.setNombre("Piso 1");

        Ubicacion almacen = new Ubicacion();
        almacen.setIdUbicacion(2L);
        almacen.setNombre("Almacén");

        destinoPiso = new UbicacionArea();
        destinoPiso.setIdUbicacionArea(ID_DESTINO);
        destinoPiso.setUbicacion(piso);
        destinoPiso.setArea(area);

        almacenAsignado = new UbicacionArea();
        almacenAsignado.setIdUbicacionArea(100L);
        almacenAsignado.setUbicacion(almacen);
        almacenAsignado.setArea(area);

        almacenero = new Usuario();
        almacenero.setId(ID_USUARIO);
        almacenero.setAreaAsignado(almacenAsignado);

        Producto producto = new Producto();
        producto.setIdProducto(1L);
        producto.setNombre("Camisa");
        producto.setCodigoIdentificacion("CAM-01");

        ProductoVariante variante = new ProductoVariante();
        variante.setIdProductoVariante(ID_VARIANTE);
        variante.setProducto(producto);
        variante.setColor("Azul");
        variante.setTalla("M");

        filaStockCero = new Inventario();
        filaStockCero.setVariante(variante);
        filaStockCero.setUbicacionArea(destinoPiso);
        filaStockCero.setStock(0);
    }

    @Test
    void obtenerAlertas_almaceneroFiltraPorLineaDelAlmacenAsignado() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(inventarioRepository.findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS)))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.of());

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas).hasSize(1);
        verify(inventarioRepository, never()).findParaReposicion(eq(4), any());
        verify(inventarioRepository).findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS));
    }

    @Test
    void obtenerAlertas_supervisorSinSector_veTodasLasLineas() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(null);
        when(inventarioRepository.findParaReposicion(eq(4), any()))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.of());

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas).hasSize(1);
        verify(inventarioRepository).findParaReposicion(eq(4), any());
        verify(inventarioRepository, never()).findParaReposicionPorLineaCatalogo(eq(4), any(), any());
    }

    @Test
    void obtenerAlertas_incluyeStockCero_yCantidadSugerida15() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(inventarioRepository.findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS)))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.of());

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas.get(0).stockActual()).isZero();
        assertThat(alertas.get(0).stockObjetivo()).isEqualTo(15);
        assertThat(alertas.get(0).cantidadSugerida()).isEqualTo(15);
        assertThat(alertas.get(0).tieneSolicitudPendiente()).isFalse();
    }

    @Test
    void obtenerAlertas_stockTres_sugiereDoceHastaObjetivo15() {
        filaStockCero.setStock(3);
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(inventarioRepository.findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS)))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.of());

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas.get(0).stockActual()).isEqualTo(3);
        assertThat(alertas.get(0).stockObjetivo()).isEqualTo(15);
        assertThat(alertas.get(0).cantidadSugerida()).isEqualTo(12);
    }

    @Test
    void obtenerAlertas_respetaStockMaximoPorFila() {
        filaStockCero.setStock(3);
        filaStockCero.setStockMaximo(20);
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(inventarioRepository.findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS)))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.of());

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas.get(0).stockObjetivo()).isEqualTo(20);
        assertThat(alertas.get(0).cantidadSugerida()).isEqualTo(17);
    }

    @Test
    void obtenerAlertas_marcaPendienteSoloParaMismoDestino() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(inventarioRepository.findParaReposicionPorLineaCatalogo(eq(4), any(), eq(ID_AREA_DAMAS)))
                .thenReturn(List.of(filaStockCero));
        when(detalleSolicitudRepository.findParesVarianteDestinoReposicionPendiente())
                .thenReturn(List.<Object[]>of(new Object[] { ID_VARIANTE, ID_DESTINO }));

        List<AlertaReposicionDTO> alertas = service.obtenerAlertas(almacenero, null);

        assertThat(alertas.get(0).tieneSolicitudPendiente()).isTrue();
    }

    @Test
    void reponer_lanza409SiYaHayPendienteEnMismoDestino() {
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(java.util.Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(inventarioService.stockEnUbicacionArea(ID_VARIANTE, ID_DESTINO)).thenReturn(2);
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(true);

        assertThatThrownBy(() -> service.reponer(ID_VARIANTE, ID_DESTINO, ID_USUARIO))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(solicitudService, never()).crear(any(CrearSolicitudDTO.class), eq(ID_USUARIO));
    }

    @Test
    void reponer_creaSolicitudConUsuarioAutenticado() {
        UbicacionArea origenAlmacen = new UbicacionArea();
        origenAlmacen.setIdUbicacionArea(100L);

        Solicitud creada = new Solicitud();
        creada.setIdSolicitud(1L);

        Inventario filaPiso = new Inventario();
        filaPiso.setVariante(filaStockCero.getVariante());
        filaPiso.setUbicacionArea(destinoPiso);
        filaPiso.setStock(3);

        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(java.util.Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(inventarioService.stockEnUbicacionArea(ID_VARIANTE, ID_DESTINO)).thenReturn(3);
        when(inventarioRepository.findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                ID_VARIANTE, ID_DESTINO))
                .thenReturn(java.util.Optional.of(filaPiso));
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(false);
        when(inventarioService.stockEnAlmacenDeLinea(ID_VARIANTE, destinoPiso)).thenReturn(20);
        when(inventarioService.resolverOrigenAlmacenConStock(ID_VARIANTE, 12, destinoPiso))
                .thenReturn(origenAlmacen);
        when(solicitudService.crear(any(CrearSolicitudDTO.class), eq(ID_USUARIO))).thenReturn(creada);

        Solicitud result = service.reponer(ID_VARIANTE, ID_DESTINO, ID_USUARIO);

        assertThat(result).isSameAs(creada);
        verify(inventarioService).resolverOrigenAlmacenConStock(ID_VARIANTE, 12, destinoPiso);
        verify(solicitudService).crear(any(CrearSolicitudDTO.class), eq(ID_USUARIO));
        verify(notificationService).sendNotificationObject(any());
    }

    @Test
    void reponer_conCantidadPersonalizada_usaCantidadIndicada() {
        UbicacionArea origenAlmacen = new UbicacionArea();
        origenAlmacen.setIdUbicacionArea(100L);

        Solicitud creada = new Solicitud();
        creada.setIdSolicitud(1L);

        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(java.util.Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(inventarioService.stockEnUbicacionArea(ID_VARIANTE, ID_DESTINO)).thenReturn(2);
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(false);
        when(inventarioService.stockEnAlmacenDeLinea(ID_VARIANTE, destinoPiso)).thenReturn(20);
        when(inventarioService.resolverOrigenAlmacenConStock(ID_VARIANTE, 8, destinoPiso))
                .thenReturn(origenAlmacen);
        when(solicitudService.crear(any(CrearSolicitudDTO.class), eq(ID_USUARIO))).thenReturn(creada);

        Solicitud result = service.reponer(ID_VARIANTE, ID_DESTINO, ID_USUARIO, 8);

        assertThat(result).isSameAs(creada);
        verify(inventarioService).resolverOrigenAlmacenConStock(ID_VARIANTE, 8, destinoPiso);
    }

    @Test
    void reponer_rechazaSiCantidadSuperaStockAlmacen() {
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(java.util.Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(inventarioService.stockEnUbicacionArea(ID_VARIANTE, ID_DESTINO)).thenReturn(2);
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(false);
        when(inventarioService.stockEnAlmacenDeLinea(ID_VARIANTE, destinoPiso)).thenReturn(5);

        assertThatThrownBy(() -> service.reponer(ID_VARIANTE, ID_DESTINO, ID_USUARIO, 10))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(solicitudService, never()).crear(any(CrearSolicitudDTO.class), eq(ID_USUARIO));
    }
}
