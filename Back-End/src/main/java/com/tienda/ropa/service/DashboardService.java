package com.tienda.ropa.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.DashboardRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    @Autowired
    private DashboardRepository dashboardRepository;
    
    @Autowired
    private CategoriaRepository categoriaRepository;

    public Map<String, Object> obtenerEstadisticasGenerales() {
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

    public List<Map<String, Object>> obtenerDistribucionCategorias() {
        List<Object[]> resultados = dashboardRepository.getDistribucionCategorias();
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

    public Map<String, Object> obtenerEstadoInventario() {
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
}
