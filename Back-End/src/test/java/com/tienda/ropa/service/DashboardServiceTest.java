package com.tienda.ropa.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tienda.ropa.entity.Area;
import com.tienda.ropa.entity.Ubicacion;
import com.tienda.ropa.entity.UbicacionArea;
import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.DashboardRepository;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private DashboardRepository dashboardRepository;
    @Mock
    private CategoriaRepository categoriaRepository;
    @Mock
    private InventarioContextService inventarioContextService;

    @InjectMocks
    private DashboardService dashboardService;

    private Usuario almacenero;
    private static final Long ID_AREA_DAMAS = 10L;

    @BeforeEach
    void setUp() {
        Area area = new Area();
        area.setIdArea(ID_AREA_DAMAS);
        area.setNombre("Damas");

        Ubicacion almacen = new Ubicacion();
        almacen.setNombre("Almacén");

        UbicacionArea ua = new UbicacionArea();
        ua.setIdUbicacionArea(100L);
        ua.setUbicacion(almacen);
        ua.setArea(area);

        almacenero = new Usuario();
        almacenero.setId(1L);
        almacenero.setAreaAsignado(ua);
    }

    @Test
    void estadisticas_almacenero_usaStockEnLinea() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        List<Object[]> stockLinea = List.of(
                new Object[] { 1L, 0 },
                new Object[] { 2L, 3 },
                new Object[] { 3L, 20 });
        when(dashboardRepository.sumStockPorProductoEnLinea(ID_AREA_DAMAS)).thenReturn(stockLinea);
        when(dashboardRepository.getDistribucionCategoriasEnLinea(ID_AREA_DAMAS))
                .thenReturn(Collections.singletonList(new Object[] { "Damas", 2L }));

        Map<String, Object> stats = dashboardService.obtenerEstadisticasGenerales(almacenero, null);

        assertThat(stats.get("total")).isEqualTo(2L);
        assertThat(stats.get("sinStock")).isEqualTo(1L);
        assertThat(stats.get("bajoStock")).isEqualTo(1L);
        verify(dashboardRepository).sumStockPorProductoEnLinea(ID_AREA_DAMAS);
    }

    @Test
    void estadisticas_supervisorSinSector_usaGlobales() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(null);
        when(dashboardRepository.countTotalProductos()).thenReturn(100L);
        when(dashboardRepository.countProductosBajoStock()).thenReturn(10L);
        when(dashboardRepository.countProductosSinStock()).thenReturn(5L);
        when(categoriaRepository.count()).thenReturn(8L);

        Map<String, Object> stats = dashboardService.obtenerEstadisticasGenerales(almacenero, null);

        assertThat(stats.get("total")).isEqualTo(100L);
        verify(dashboardRepository).countTotalProductos();
    }

    @Test
    void estadoInventario_almacenero_calculaPorcentajesPorLinea() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        when(dashboardRepository.sumStockPorProductoEnLinea(ID_AREA_DAMAS)).thenReturn(List.of(
                new Object[] { 1L, 0 },
                new Object[] { 2L, 4 },
                new Object[] { 3L, 20 }));
        when(dashboardRepository.getDistribucionCategoriasEnLinea(ID_AREA_DAMAS)).thenReturn(List.<Object[]>of());

        Map<String, Object> estado = dashboardService.obtenerEstadoInventario(almacenero, null);

        assertThat(estado.get("sinStock")).isEqualTo(33L);
        assertThat(estado.get("critico")).isEqualTo(33L);
        assertThat(estado.get("normal")).isEqualTo(33L);
    }

    @Test
    void distribucion_almacenero_filtraPorLinea() {
        when(inventarioContextService.resolverIdAreaCatalogoFiltro(almacenero, null)).thenReturn(ID_AREA_DAMAS);
        List<Object[]> distLinea = Collections.singletonList(new Object[] { "Damas", 5L });
        when(dashboardRepository.getDistribucionCategoriasEnLinea(ID_AREA_DAMAS)).thenReturn(distLinea);

        var dist = dashboardService.obtenerDistribucionCategorias(almacenero, null);

        assertThat(dist).hasSize(1);
        assertThat(dist.get(0).get("nombre")).isEqualTo("Damas");
        assertThat(dist.get(0).get("porcentaje")).isEqualTo(100L);
        verify(dashboardRepository).getDistribucionCategoriasEnLinea(eq(ID_AREA_DAMAS));
    }
}
