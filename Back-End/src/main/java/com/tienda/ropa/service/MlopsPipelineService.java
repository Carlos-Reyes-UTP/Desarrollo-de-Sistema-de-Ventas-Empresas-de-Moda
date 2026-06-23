package com.tienda.ropa.service;

import com.tienda.ropa.entity.DetalleVenta;
import com.tienda.ropa.repository.DetalleVentaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Slf4j
@Service
public class MlopsPipelineService {

    private final DetalleVentaRepository detalleVentaRepository;
    private final RestTemplate restTemplate;

    @Value("${dakani.mlops.csv-path}")
    private String csvFilePath;

    @Value("${dakani.mlops.fastapi-url}")
    private String pythonTrainUrl;

    public MlopsPipelineService(DetalleVentaRepository detalleVentaRepository, RestTemplate restTemplate) {
        this.detalleVentaRepository = detalleVentaRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Tarea programada que se ejecuta todos los días 25 de cada mes a las 3:00 a.m.
     * Cron format: "segundo minuto hora día-del-mes mes día-de-la-semana"
     * "0 0 3 25 * *" (todos los días 25 a las 03:00:00)
     */
    @Scheduled(cron = "0 0 3 25 * *")
    public void ejecutarEntrenamientoMensual() {
        log.info("Iniciando la tarea programada de MLOps: exportación de ventas y entrenamiento de modelo.");
        ejecutarEntrenamientoManual();
    }

    /**
     * Ejecuta el pipeline de MLOps manualmente y retorna las métricas del entrenamiento
     */
    public Map<String, Object> ejecutarEntrenamientoManual() {
        log.info("Iniciando entrenamiento de MLOps manual.");

        try {
            // 1. Consultar base de datos: Obtener historial completo de ventas
            List<DetalleVenta> detalles = detalleVentaRepository.findAll();
            log.info("Se obtuvieron {} registros de detalles de venta desde la base de datos.", detalles.size());

            // 2. Generar el archivo CSV
            guardarVentasEnCsv(detalles);

            // 3. Llamar al Microservicio de Python y obtener resultados
            Map<String, Object> resultado = llamarMicroservicioEntrenamiento();

            log.info("Entrenamiento de MLOps completado exitosamente.");
            return resultado;
        } catch (Exception e) {
            log.error("Error crítico durante la ejecución del entrenamiento de MLOps", e);
            Map<String, Object> errorRes = new HashMap<>();
            errorRes.put("status", "error");
            errorRes.put("message", e.getMessage());
            return errorRes;
        }
    }

    private void guardarVentasEnCsv(List<DetalleVenta> detalles) throws IOException {
        log.info("Escribiendo el archivo CSV en la ruta física: {}", csvFilePath);

        File file = new File(csvFilePath);
        
        // Crear directorios padres si no existen
        File parentDir = file.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            if (parentDir.mkdirs()) {
                log.info("Se crearon los directorios padres para el archivo CSV: {}", parentDir.getAbsolutePath());
            }
        }

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(
                new FileOutputStream(file), StandardCharsets.UTF_8))) {

            // Cabecera exacta solicitada con comillas dobles y separada por punto y coma (;)
            writer.write("\"ID de Producto\";\"Color\";\"Talla\";\"Cantidad\";\"Fecha\"");
            writer.newLine();

            // Escribir cada registro de venta
            for (DetalleVenta detalle : detalles) {
                Long idProducto = 0L;
                String color = "";
                String talla = "";

                if (detalle.getProductoVariante() != null) {
                    color = detalle.getProductoVariante().getColor();
                    talla = detalle.getProductoVariante().getTalla();
                    if (detalle.getProductoVariante().getProducto() != null) {
                        idProducto = detalle.getProductoVariante().getProducto().getIdProducto();
                    }
                }

                int cantidad = detalle.getCantidad();

                String fechaFormatted = "";
                if (detalle.getVenta() != null && detalle.getVenta().getFechaVenta() != null) {
                    fechaFormatted = detalle.getVenta().getFechaVenta().format(dateFormatter);
                }

                // Escribir fila envuelta en comillas dobles y separada por punto y coma (;)
                writer.write(String.format("\"%d\";\"%s\";\"%s\";\"%d\";\"%s\"", idProducto, color, talla, cantidad, fechaFormatted));
                writer.newLine();
            }
            log.info("Archivo CSV guardado correctamente con {} registros.", detalles.size());
        } catch (IOException e) {
            log.error("Fallo al escribir el archivo CSV en la ruta {}", csvFilePath, e);
            throw e;
        }
    }

    private Map<String, Object> llamarMicroservicioEntrenamiento() {
        log.info("Haciendo petición POST al microservicio de Python para entrenar el modelo: {}", pythonTrainUrl);
        Map<String, Object> resultado = new HashMap<>();
        try {
            // Petición HTTP POST sin cuerpo/body
            ResponseEntity<Map> response = restTemplate.postForEntity(pythonTrainUrl, null, Map.class);
            log.info("Respuesta del microservicio de entrenamiento recibida con código HTTP: {}", response.getStatusCode().value());
            
            if (response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                Object mae = body.get("mae");
                Object rmse = body.get("rmse");
                log.info("--- MÉTRICAS DE EVALUACIÓN RECIBIDAS ---");
                log.info("Error Absoluto Medio (MAE): {}", mae);
                log.info("Raíz del Error Cuadrático Medio (RMSE): {}", rmse);
                
                resultado.put("status", body.get("status"));
                resultado.put("message", body.get("message"));
                resultado.put("mae", mae);
                resultado.put("rmse", rmse);
            } else {
                resultado.put("status", "success");
                resultado.put("message", "Entrenamiento completado sin métricas devueltas.");
            }
        } catch (Exception e) {
            log.error("Fallo al llamar al microservicio de entrenamiento en la URL {}", pythonTrainUrl, e);
            resultado.put("status", "error");
            resultado.put("message", "Fallo al llamar al microservicio de entrenamiento: " + e.getMessage());
        }
        return resultado;
    }

    /**
     * Ejecuta la optimización avanzada de MLOps manualmente y retorna las métricas.
     */
    public Map<String, Object> ejecutarOptimizacionManual() {
        log.info("Iniciando optimización de hiperparámetros de MLOps manual.");

        try {
            // 1. Consultar base de datos: Obtener historial completo de ventas
            List<DetalleVenta> detalles = detalleVentaRepository.findAll();
            log.info("Se obtuvieron {} registros de detalles de venta para optimización.", detalles.size());

            // 2. Generar el archivo CSV
            guardarVentasEnCsv(detalles);

            // 3. Llamar al Microservicio de Python para optimización y obtener resultados
            Map<String, Object> resultado = llamarMicroservicioOptimizacion();

            log.info("Optimización de MLOps completada exitosamente.");
            return resultado;
        } catch (Exception e) {
            log.error("Error crítico durante la ejecución de la optimización de MLOps", e);
            Map<String, Object> errorRes = new HashMap<>();
            errorRes.put("status", "error");
            errorRes.put("message", e.getMessage());
            return errorRes;
        }
    }

    private Map<String, Object> llamarMicroservicioOptimizacion() {
        String urlOptimizacion = pythonTrainUrl.replace("/entrenar_modelo", "/optimizar_modelo");
        log.info("Haciendo petición POST al microservicio de Python para optimizar el modelo: {}", urlOptimizacion);
        Map<String, Object> resultado = new HashMap<>();
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(urlOptimizacion, null, Map.class);
            log.info("Respuesta del microservicio de optimización recibida con código HTTP: {}", response.getStatusCode().value());
            
            if (response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                Object mae = body.get("mae");
                Object rmse = body.get("rmse");
                log.info("--- MÉTRICAS DE OPTIMIZACIÓN RECIBIDAS ---");
                log.info("Error Absoluto Medio (MAE): {}", mae);
                log.info("Raíz del Error Cuadrático Medio (RMSE): {}", rmse);
                
                resultado.put("status", body.get("status"));
                resultado.put("message", body.get("message"));
                resultado.put("mae", mae);
                resultado.put("rmse", rmse);
            } else {
                resultado.put("status", "success");
                resultado.put("message", "Optimización completada sin métricas devueltas.");
            }
        } catch (Exception e) {
            log.error("Fallo al llamar al microservicio de optimización en la URL {}", urlOptimizacion, e);
            resultado.put("status", "error");
            resultado.put("message", "Fallo al llamar al microservicio de optimización: " + e.getMessage());
        }
        return resultado;
    }

    /**
     * Obtiene las métricas actuales de evaluación desde el microservicio de Python
     */
    public Map<String, Object> obtenerMetricasActuales() {
        log.info("Obteniendo métricas de evaluación del modelo...");
        Map<String, Object> resultado = new HashMap<>();
        try {
            // Reemplazamos /entrenar_modelo por /metricas para la URL de consulta
            String urlMetricas = pythonTrainUrl.replace("/entrenar_modelo", "/metricas");
            log.info("Haciendo petición GET al microservicio de Python para métricas: {}", urlMetricas);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(urlMetricas, Map.class);
            log.info("Respuesta recibida de métricas con código: {}", response.getStatusCode().value());
            
            if (response.getBody() != null) {
                Map<?, ?> body = response.getBody();
                resultado.put("status", body.get("status"));
                resultado.put("mae", body.get("mae"));
                resultado.put("rmse", body.get("rmse"));
            } else {
                resultado.put("status", "error");
                resultado.put("message", "Respuesta vacía del microservicio de métricas.");
            }
        } catch (Exception e) {
            log.error("Fallo al llamar al microservicio de métricas", e);
            resultado.put("status", "error");
            resultado.put("message", "Fallo al obtener métricas del microservicio: " + e.getMessage());
            resultado.put("mae", 0.0);
            resultado.put("rmse", 0.0);
        }
        return resultado;
    }
}
