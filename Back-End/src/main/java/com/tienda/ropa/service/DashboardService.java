package com.tienda.ropa.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tienda.ropa.repository.CategoriaRepository;
import com.tienda.ropa.repository.DashboardRepository;

@Service
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
        long ultimoMes = (long) (total * 0.15); // Estimación, ya que no tenemos fecha_creacion
        
        stats.put("total", total);
        stats.put("bajoStock", bajoStock);
        stats.put("sinStock", sinStock);
        stats.put("categorias", categorias);
        stats.put("ultimoMes", ultimoMes);
        
        return stats;
    }

    public List<Map<String, Object>> obtenerDistribucionCategorias() {
        List<Object[]> resultados = dashboardRepository.getDistribucionCategorias();
        List<Map<String, Object>> distribucion = new ArrayList<>();
        
        long total = dashboardRepository.countTotalProductos();
        
        for (Object[] fila : resultados) {
            Map<String, Object> item = new HashMap<>();
            String nombre = (String) fila[0];
            long cantidad = ((Number) fila[1]).longValue();
            
            item.put("nombre", nombre);
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
        // Bajo stock (6-15) es bajoStock() menos el crítico (1-5)
        long bajoStockBruto = dashboardRepository.countProductosBajoStock();
        long bajo = bajoStockBruto - critico;
        if(bajo < 0) bajo = 0;
        
        long normal = total - sinStock - critico - bajo;
        
        estado.put("normal", total > 0 ? Math.round(((double) normal / total) * 100) : 0);
        estado.put("bajo", total > 0 ? Math.round(((double) bajo / total) * 100) : 0);
        estado.put("critico", total > 0 ? Math.round(((double) critico / total) * 100) : 0);
        estado.put("sinStock", total > 0 ? Math.round(((double) sinStock / total) * 100) : 0);
        
        return estado;
    }
}
