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

        try {
            // 1. Consultar base de datos: Obtener historial completo de ventas
            List<DetalleVenta> detalles = detalleVentaRepository.findAll();
            log.info("Se obtuvieron {} registros de detalles de venta desde la base de datos.", detalles.size());

            // 2. Generar el archivo CSV
            guardarVentasEnCsv(detalles);

            // 3. Llamar al Microservicio de Python
            llamarMicroservicioEntrenamiento();

            log.info("Tarea programada de MLOps completada exitosamente.");
        } catch (Exception e) {
            log.error("Error crítico durante la ejecución de la tarea de MLOps", e);
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

    private void llamarMicroservicioEntrenamiento() {
        log.info("Haciendo petición POST al microservicio de Python para entrenar el modelo: {}", pythonTrainUrl);
        try {
            // Petición HTTP POST sin cuerpo/body
            ResponseEntity<Void> response = restTemplate.postForEntity(pythonTrainUrl, null, Void.class);
            log.info("Respuesta del microservicio de entrenamiento recibida con código HTTP: {}", response.getStatusCode().value());
        } catch (Exception e) {
            log.error("Fallo al llamar al microservicio de entrenamiento en la URL {}", pythonTrainUrl, e);
        }
    }
}
