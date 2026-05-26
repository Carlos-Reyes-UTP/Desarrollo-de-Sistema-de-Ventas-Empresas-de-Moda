package com.tienda.ropa.service;

import com.tienda.ropa.dto.UbicacionOperativaDTO;
import com.tienda.ropa.dto.UbicacionesResumenDTO;
import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.repository.AreaRepository;
import com.tienda.ropa.repository.InventarioRepository;
import com.tienda.ropa.repository.UbicacionAreaRepository;
import com.tienda.ropa.repository.UbicacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GerenteEstructuraAlmacenServiceTest {

    @Mock
    private UbicacionRepository ubicacionRepository;
    @Mock
    private AreaRepository areaRepository;
    @Mock
    private UbicacionAreaRepository ubicacionAreaRepository;
    @Mock
    private InventarioRepository inventarioRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private GerenteEstructuraAlmacenService service;

    private Ubicacion piso1;
    private Ubicacion piso2;
    private Area damas;
    private Area caballeros;
    private Area ninos;

    @BeforeEach
    void setUp() {
        piso1 = piso(1L, "Piso 1", true);
        piso2 = piso(2L, "Piso 2", true);
        damas = area(10L, "Damas", true);
        caballeros = area(11L, "Caballeros", true);
        ninos = area(12L, "Niños", true);

        when(inventarioRepository.sumStockByUbicacionArea(anyLong())).thenReturn(0);
        when(inventarioRepository.findStockPositivoByUbicacionArea(anyLong())).thenReturn(List.of());
    }

    @Test
    void listarUbicacionesResumen_agrupaPorPisoYCalculaFaltantes() {
        UbicacionArea ua1 = ubicacionArea(100L, piso1, damas, true);
        UbicacionArea ua2 = ubicacionArea(101L, piso1, caballeros, true);
        UbicacionArea ua3 = ubicacionArea(102L, piso2, damas, true);

        when(ubicacionAreaRepository.findAllWithUbicacionYAreaForGerente())
                .thenReturn(List.of(ua1, ua2, ua3));
        when(ubicacionRepository.findAllByActivoTrueOrderByNombreAsc())
                .thenReturn(List.of(piso1, piso2));
        when(areaRepository.findAllByActivoTrueOrderByNombreAsc())
                .thenReturn(List.of(damas, caballeros, ninos));

        UbicacionesResumenDTO resumen = service.listarUbicacionesResumen(false);

        assertThat(resumen.grupos()).hasSize(2);
        assertThat(resumen.grupos().get(0).nombrePiso()).isEqualTo("Piso 1");
        assertThat(resumen.grupos().get(0).ubicaciones()).hasSize(2);
        assertThat(resumen.cobertura().combinacionesPosibles()).isEqualTo(6);
        assertThat(resumen.cobertura().combinacionesExistentes()).isEqualTo(3);
        assertThat(resumen.cobertura().combinacionesFaltantes()).isEqualTo(3);
        assertThat(resumen.cobertura().faltantes()).isNotEmpty();
        assertThat(resumen.global().totalUbicaciones()).isEqualTo(3);
    }

    @Test
    void toUbicacionOperativaDTO_operativaFalseSiPisoInactivo() {
        Ubicacion pisoInactivo = piso(3L, "Piso 3", false);
        UbicacionArea ua = ubicacionArea(200L, pisoInactivo, damas, true);

        when(ubicacionAreaRepository.findAllWithUbicacionYAreaForGerente())
                .thenReturn(List.of(ua));
        when(ubicacionRepository.findAllByActivoTrueOrderByNombreAsc())
                .thenReturn(List.of(piso1, piso2));
        when(areaRepository.findAllByActivoTrueOrderByNombreAsc())
                .thenReturn(List.of(damas, caballeros, ninos));

        UbicacionesResumenDTO resumen = service.listarUbicacionesResumen(true);

        UbicacionOperativaDTO dto = resumen.grupos().stream()
                .flatMap(g -> g.ubicaciones().stream())
                .filter(u -> u.idUbicacionArea().equals(200L))
                .findFirst()
                .orElseThrow();

        assertThat(dto.activo()).isTrue();
        assertThat(dto.pisoActivo()).isFalse();
        assertThat(dto.operativa()).isFalse();
    }

    private static Ubicacion piso(Long id, String nombre, boolean activo) {
        Ubicacion u = new Ubicacion();
        u.setIdUbicacion(id);
        u.setNombre(nombre);
        u.setActivo(activo);
        return u;
    }

    private static Area area(Long id, String nombre, boolean activo) {
        Area a = new Area();
        a.setIdArea(id);
        a.setNombre(nombre);
        a.setActivo(activo);
        return a;
    }

    private static UbicacionArea ubicacionArea(Long id, Ubicacion piso, Area area, boolean activo) {
        UbicacionArea ua = new UbicacionArea();
        ua.setIdUbicacionArea(id);
        ua.setUbicacion(piso);
        ua.setArea(area);
        ua.setActivo(activo);
        return ua;
    }
}
