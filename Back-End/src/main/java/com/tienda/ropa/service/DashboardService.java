package com.tienda.ropa.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.entity.Usuario;
import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.DashboardRepository;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DashboardService {

    private static final int UMBRAL_BAJO_MAX = 15;
    private static final int UMBRAL_CRITICO_MAX = 5;

    private final DashboardRepository dashboardRepository;
    private final CategoriaRepository categoriaRepository;
    private final InventarioContextService inventarioContextService;

    public Map<String, Object> obtenerEstadisticasGenerales(Usuario usuario, String sectorOpcional) {
        Long idAreaFiltro = inventarioContextService.resolverIdAreaCatalogoFiltro(usuario, sectorOpcional);
        if (idAreaFiltro != null) {
            return estadisticasDesdeStockEnLinea(idAreaFiltro);
        }
        return estadisticasGlobales();
    }

    public List<Map<String, Object>> obtenerDistribucionCategorias(Usuario usuario, String sectorOpcional) {
        Long idAreaFiltro = inventarioContextService.resolverIdAreaCatalogoFiltro(usuario, sectorOpcional);
        List<Object[]> resultados = idAreaFiltro != null
                ? dashboardRepository.getDistribucionCategoriasEnLinea(idAreaFiltro)
                : dashboardRepository.getDistribucionCategorias();
        return mapearDistribucion(resultados);
    }

    public Map<String, Object> obtenerEstadoInventario(Usuario usuario, String sectorOpcional) {
        Long idAreaFiltro = inventarioContextService.resolverIdAreaCatalogoFiltro(usuario, sectorOpcional);
        if (idAreaFiltro != null) {
            return estadoInventarioDesdeStockEnLinea(idAreaFiltro);
        }
        return estadoInventarioGlobal();
    }

    private Map<String, Object> estadisticasGlobales() {
        Map<String, Object> stats = new HashMap<>();
        long total = dashboardRepository.countTotalProductos();
        long bajoStock = dashboardRepository.countProductosBajoStock();
        long sinStock = dashboardRepository.countProductosSinStock();
        long categorias = categoriaRepository.count();
        stats.put("total", total);
        stats.put("bajoStock", bajoStock);
        stats.put("sinStock", sinStock);
        stats.put("categorias", categorias);
        stats.put("ultimoMes", (long) (total * 0.15));
        return stats;
    }

    private Map<String, Object> estadisticasDesdeStockEnLinea(Long idAreaCatalogo) {
        ConteosLinea conteos = contarPorStockEnLinea(idAreaCatalogo);
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", conteos.conStockPositivo());
        stats.put("bajoStock", conteos.bajoStock());
        stats.put("sinStock", conteos.sinStock());
        stats.put("categorias", conteos.categoriasDistintas());
        stats.put("ultimoMes", (long) (conteos.conStockPositivo() * 0.15));
        return stats;
    }

    private Map<String, Object> estadoInventarioGlobal() {
        Map<String, Object> estado = new HashMap<>();
        long total = dashboardRepository.countTotalProductos();
        long sinStock = dashboardRepository.countProductosSinStock();
        long critico = dashboardRepository.countProductosStockCritico();
        long bajoStockBruto = dashboardRepository.countProductosBajoStock();
        long bajo = Math.max(0, bajoStockBruto - critico);
        long normal = total - sinStock - critico - bajo;
        estado.put("normal", total > 0 ? Math.round(((double) normal / total) * 100) : 0);
        estado.put("bajo", total > 0 ? Math.round(((double) bajo / total) * 100) : 0);
        estado.put("critico", total > 0 ? Math.round(((double) critico / total) * 100) : 0);
        estado.put("sinStock", total > 0 ? Math.round(((double) sinStock / total) * 100) : 0);
        return estado;
    }

    private Map<String, Object> estadoInventarioDesdeStockEnLinea(Long idAreaCatalogo) {
        ConteosLinea conteos = contarPorStockEnLinea(idAreaCatalogo);
        long total = conteos.totalProductos();
        long sinStock = conteos.sinStock();
        long critico = conteos.critico();
        long bajo = conteos.bajoExclusivo();
        long normal = conteos.normal();
        Map<String, Object> estado = new HashMap<>();
        estado.put("normal", total > 0 ? Math.round(((double) normal / total) * 100) : 0);
        estado.put("bajo", total > 0 ? Math.round(((double) bajo / total) * 100) : 0);
        estado.put("critico", total > 0 ? Math.round(((double) critico / total) * 100) : 0);
        estado.put("sinStock", total > 0 ? Math.round(((double) sinStock / total) * 100) : 0);
        return estado;
    }

    private ConteosLinea contarPorStockEnLinea(Long idAreaCatalogo) {
        List<Object[]> filas = dashboardRepository.sumStockPorProductoEnLinea(idAreaCatalogo);
        long sinStock = 0;
        long critico = 0;
        long bajoExclusivo = 0;
        long normal = 0;
        long conStockPositivo = 0;
        Set<Long> productos = new HashSet<>();

        for (Object[] fila : filas) {
            Long idProducto = (Long) fila[0];
            int stock = ((Number) fila[1]).intValue();
            productos.add(idProducto);

            if (stock == 0) {
                sinStock++;
            } else if (stock <= UMBRAL_CRITICO_MAX) {
                critico++;
                conStockPositivo++;
            } else if (stock <= UMBRAL_BAJO_MAX) {
                bajoExclusivo++;
                conStockPositivo++;
            } else {
                normal++;
                conStockPositivo++;
            }
        }

        long categoriasDistintas = contarCategoriasEnLinea(idAreaCatalogo);
        return new ConteosLinea(
                productos.size(),
                sinStock,
                critico,
                bajoExclusivo,
                normal,
                conStockPositivo,
                categoriasDistintas);
    }

    private long contarCategoriasEnLinea(Long idAreaCatalogo) {
        return dashboardRepository.getDistribucionCategoriasEnLinea(idAreaCatalogo).size();
    }

    private List<Map<String, Object>> mapearDistribucion(List<Object[]> resultados) {
        if (resultados.isEmpty()) {
            return List.of();
        }
        long total = 0;
        for (Object[] fila : resultados) {
            total += ((Number) fila[1]).longValue();
        }
        List<Map<String, Object>> distribucion = new ArrayList<>(resultados.size());
        for (Object[] fila : resultados) {
            Map<String, Object> item = new HashMap<>(3);
            long cantidad = ((Number) fila[1]).longValue();
            item.put("nombre", fila[0]);
            item.put("cantidadProductos", cantidad);
            item.put("porcentaje", total > 0 ? Math.round(((double) cantidad / total) * 100) : 0);
            distribucion.add(item);
        }
        return distribucion;
    }

    private record ConteosLinea(
            long totalProductos,
            long sinStock,
            long critico,
            long bajoExclusivo,
            long normal,
            long conStockPositivo,
            long categoriasDistintas) {

        long bajoStock() {
            return critico + bajoExclusivo;
        }
    }
}
