package com.tienda.ropa.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tienda.ropa.dto.CrearSolicitudDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.EstadoSolicitud;
import com.tienda.ropa.entity.Inventario;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.entity.Solicitud;
import com.tienda.ropa.entity.TipoSolicitud;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.DetalleSolicitudRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class ReposicionAutomaticaServiceTest {

    @Mock
    private InventarioRepository inventarioRepository;
    @Mock
    private InventarioService inventarioService;
    @Mock
    private UbicacionAreaRepository ubicacionAreaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private DetalleSolicitudRepository detalleSolicitudRepository;
    @Mock
    private SolicitudService solicitudService;

    @InjectMocks
    private ReposicionAutomaticaService service;

    private static final Long ID_VARIANTE = 50L;
    private static final Long ID_DESTINO = 200L;
    private static final Long ID_ALMACEN = 100L;
    private static final Long ID_SISTEMA = 99L;

    private Inventario filaPiso;
    private UbicacionArea destinoPiso;
    private UbicacionArea origenAlmacen;
    private Usuario usuarioSistema;

    @BeforeEach
    void setUp() {
        Area area = new Area();
        area.setIdArea(10L);
        area.setNombre("Damas");

        Ubicacion piso = new Ubicacion();
        piso.setNombre("Piso 1");

        Ubicacion almacen = new Ubicacion();
        almacen.setNombre("Almacén");

        destinoPiso = new UbicacionArea();
        destinoPiso.setIdUbicacionArea(ID_DESTINO);
        destinoPiso.setUbicacion(piso);
        destinoPiso.setArea(area);

        origenAlmacen = new UbicacionArea();
        origenAlmacen.setIdUbicacionArea(ID_ALMACEN);
        origenAlmacen.setUbicacion(almacen);
        origenAlmacen.setArea(area);

        ProductoVariante variante = new ProductoVariante();
        variante.setIdProductoVariante(ID_VARIANTE);

        filaPiso = new Inventario();
        filaPiso.setVariante(variante);
        filaPiso.setUbicacionArea(destinoPiso);
        filaPiso.setStock(2);
        filaPiso.setStockMinimo(5);
        filaPiso.setStockMaximo(15);

        usuarioSistema = new Usuario();
        usuarioSistema.setId(ID_SISTEMA);
        usuarioSistema.setUsuario(ReposicionAutomaticaService.USUARIO_SISTEMA);
    }

    @Test
    void evaluarTrasSalida_noCreaSiStockMayorQueMinimo() {
        filaPiso.setStock(10);
        when(inventarioRepository.findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                ID_VARIANTE, ID_DESTINO)).thenReturn(Optional.of(filaPiso));
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);

        service.evaluarTrasSalidaEnUbicacionArea(ID_VARIANTE, ID_DESTINO);

        verify(solicitudService, never()).crear(any(CrearSolicitudDTO.class), eq(ID_SISTEMA));
    }

    @Test
    void evaluarTrasSalida_noCreaSiDestinoEsAlmacen() {
        when(inventarioRepository.findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                ID_VARIANTE, ID_ALMACEN)).thenReturn(Optional.of(filaPiso));
        filaPiso.setUbicacionArea(origenAlmacen);
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_ALMACEN))
                .thenReturn(Optional.of(origenAlmacen));
        when(inventarioService.esUbicacionAlmacen(origenAlmacen)).thenReturn(true);

        service.evaluarTrasSalidaEnUbicacionArea(ID_VARIANTE, ID_ALMACEN);

        verify(solicitudService, never()).crear(any(), any());
    }

    @Test
    void evaluarTrasSalida_noCreaSiYaHayPendienteEnMismoDestino() {
        when(inventarioRepository.findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                ID_VARIANTE, ID_DESTINO)).thenReturn(Optional.of(filaPiso));
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(true);

        service.evaluarTrasSalidaEnUbicacionArea(ID_VARIANTE, ID_DESTINO);

        verify(solicitudService, never()).crear(any(), any());
    }

    @Test
    void evaluarTrasSalida_creaSolicitudConUsuarioSistema() {
        when(inventarioRepository.findByVariante_IdProductoVarianteAndUbicacionArea_IdUbicacionArea(
                ID_VARIANTE, ID_DESTINO)).thenReturn(Optional.of(filaPiso));
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(Optional.of(destinoPiso));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(false);
        when(inventarioService.resolverOrigenAlmacenConStock(ID_VARIANTE, 13, destinoPiso))
                .thenReturn(origenAlmacen);
        when(usuarioRepository.findByUsuario(ReposicionAutomaticaService.USUARIO_SISTEMA))
                .thenReturn(Optional.of(usuarioSistema));
        when(solicitudService.crear(any(CrearSolicitudDTO.class), eq(ID_SISTEMA))).thenReturn(new Solicitud());

        service.evaluarTrasSalidaEnUbicacionArea(ID_VARIANTE, ID_DESTINO);

        verify(solicitudService).crear(any(CrearSolicitudDTO.class), eq(ID_SISTEMA));
    }

    @Test
    void evaluarTrasVentaDirectaDesdeAlmacen_creaReposicionParaPisoBajoMinimo() {
        Inventario filaAlmacen = new Inventario();
        filaAlmacen.setVariante(filaPiso.getVariante());
        filaAlmacen.setUbicacionArea(origenAlmacen);
        filaAlmacen.setStock(5);

        Inventario filaPisoBajo = new Inventario();
        filaPisoBajo.setVariante(filaPiso.getVariante());
        filaPisoBajo.setUbicacionArea(destinoPiso);
        filaPisoBajo.setStock(1);
        filaPisoBajo.setStockMinimo(5);
        filaPisoBajo.setStockMaximo(15);

        when(inventarioRepository.findByVariante_IdProductoVariante(ID_VARIANTE))
                .thenReturn(List.of(filaAlmacen, filaPisoBajo));
        when(inventarioService.esUbicacionAlmacen(destinoPiso)).thenReturn(false);
        when(ubicacionAreaRepository.findByIdWithUbicacionYArea(ID_DESTINO))
                .thenReturn(Optional.of(destinoPiso));
        when(detalleSolicitudRepository
                .existsByVariante_IdProductoVarianteAndSolicitud_TipoSolicitudAndSolicitud_EstadoAndSolicitud_UbicacionAreaDestino_IdUbicacionArea(
                        ID_VARIANTE, TipoSolicitud.REPOSICION, EstadoSolicitud.PENDIENTE, ID_DESTINO))
                .thenReturn(false);
        when(inventarioService.stockEnUbicacionArea(ID_VARIANTE, ID_ALMACEN)).thenReturn(20);
        when(ubicacionAreaRepository.findById(ID_ALMACEN)).thenReturn(Optional.of(origenAlmacen));
        when(usuarioRepository.findByUsuario(ReposicionAutomaticaService.USUARIO_SISTEMA))
                .thenReturn(Optional.of(usuarioSistema));
        when(solicitudService.crear(any(CrearSolicitudDTO.class), eq(ID_SISTEMA))).thenReturn(new Solicitud());

        service.evaluarTrasVentaDirectaDesdeAlmacen(ID_VARIANTE, ID_ALMACEN);

        verify(solicitudService).crear(any(CrearSolicitudDTO.class), eq(ID_SISTEMA));
    }
}
