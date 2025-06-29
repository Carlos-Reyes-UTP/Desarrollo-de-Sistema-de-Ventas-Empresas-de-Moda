package com.tienda.ropa.service.impl;

import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.oned.Code128Writer;
import com.google.zxing.oned.EAN8Writer;
import com.tienda.ropa.dto.CodigoBarrasDTO;
import com.tienda.ropa.entity.Producto;
import com.tienda.ropa.entity.ProductoVariante;
import com.tienda.ropa.repository.ProductoRepository;
import com.tienda.ropa.repository.ProductoVarianteRepository;
import com.tienda.ropa.service.CodigoBarrasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class CodigoBarrasServiceImpl implements CodigoBarrasService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoVarianteRepository productoVarianteRepository;

    @Override
    public BufferedImage generarCodigoBarras(Long idProducto, Integer ancho, Integer alto) throws Exception {
        // Verificar que el producto existe
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new Exception("No se encontró el producto con ID: " + idProducto));

        // Si el producto ya tiene un código de barras, lo devolvemos
        if (producto.getCodigoBarras() != null && !producto.getCodigoBarras().isEmpty()) {
            return generarImagenCodigoBarras(producto.getCodigoBarras(), ancho, alto);
        }

        // Generar código EAN-8 basado en el ID del producto
        String codigoBase = String.format("%07d", idProducto % 10000000); // Aseguramos que sea de 7 dígitos
        int digitoVerificador = calcularDigitoVerificador(codigoBase);
        String codigoCompleto = codigoBase + digitoVerificador;

        // Asignar el código al producto
        producto.setCodigoBarras(codigoCompleto);
        productoRepository.save(producto);

        // Generar la imagen del código de barras
        return generarImagenCodigoBarras(codigoCompleto, ancho, alto);
    }    @Override
    public BufferedImage generarCodigoBarrasVariante(Long idVariante, Integer ancho, Integer alto) throws Exception {
        // Verificar que la variante existe
        ProductoVariante variante = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new Exception("No se encontró la variante de producto con ID: " + idVariante));

        // Generar código EAN-8 basado en el ID de la variante (si no existe)
        String codigoBarras;
        if (variante.getCodigoBarrasVariante() != null && !variante.getCodigoBarrasVariante().isEmpty()) {
            codigoBarras = variante.getCodigoBarrasVariante();
        } else {
            // Utilizamos el formato 1VVVVVD donde V es el ID de variante y D es el dígito verificador
            String codigoBase = "1" + String.format("%06d", idVariante % 1000000);
            int digitoVerificador = calcularDigitoVerificador(codigoBase);
            codigoBarras = codigoBase + digitoVerificador;

            // Asignar el código a la variante
            variante.setCodigoBarrasVariante(codigoBarras);
            productoVarianteRepository.save(variante);
        }        // NUEVA LÓGICA: Generar imagen con descripción completa del producto + variante
        String nombreProducto = variante.getProducto().getNombre();
        String codigoIdentificador = variante.getProducto().getCodigoIdentificacion();
        String talla = variante.getTalla().getNombreTalla();
        String color = variante.getColor().getNombre();
        String descripcionCompleta = String.format("%s [%s] - T/%s - %s", nombreProducto, codigoIdentificador, talla, color);

        // Generar imagen con código de barras y descripción completa
        return generarCodigoBarrasConTexto(codigoBarras, descripcionCompleta, ancho != null ? ancho : 400, alto != null ? alto : 150);
    }

    @Override
    public Producto asignarCodigoBarras(Long idProducto, CodigoBarrasDTO codigoBarrasDTO) throws Exception {
        // Verificar que el producto existe
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new Exception("No se encontró el producto con ID: " + idProducto));

        String codigo = codigoBarrasDTO.getCodigo();

        // Validar que el código tenga el formato correcto (EAN-8)
        if (codigo.length() != 8 || !codigo.matches("\\d{8}")) {
            throw new Exception("El código de barras debe tener exactamente 8 dígitos numéricos");
        }

        // Validar que el código sea válido según el algoritmo EAN-8
        if (!validarCodigoBarras(codigo)) {
            throw new Exception("El código de barras no es válido según el algoritmo EAN-8");
        }

        // Verificar que el código no esté ya asignado a otro producto
        Optional<Producto> productoExistente = productoRepository.findByCodigoBarras(codigo);
        if (productoExistente.isPresent() && !productoExistente.get().getIdProducto().equals(idProducto)) {
            throw new Exception("El código de barras ya está asignado a otro producto");
        }

        // Verificar que el código no esté asignado a una variante
        Optional<ProductoVariante> varianteExistente = productoVarianteRepository.findByCodigoBarrasVariante(codigo);
        if (varianteExistente.isPresent()) {
            throw new Exception("El código de barras ya está asignado a una variante de producto");
        }

        // Asignar el código al producto
        producto.setCodigoBarras(codigo);
        return productoRepository.save(producto);
    }

    @Override
    public ProductoVariante asignarCodigoBarrasVariante(Long idVariante, CodigoBarrasDTO codigoBarrasDTO) throws Exception {
        // Verificar que la variante existe
        ProductoVariante variante = productoVarianteRepository.findById(idVariante)
                .orElseThrow(() -> new Exception("No se encontró la variante de producto con ID: " + idVariante));

        String codigo = codigoBarrasDTO.getCodigo();

        // Validar que el código tenga el formato correcto (EAN-8)
        if (codigo.length() != 8 || !codigo.matches("\\d{8}")) {
            throw new Exception("El código de barras debe tener exactamente 8 dígitos numéricos");
        }

        // Validar que el código sea válido según el algoritmo EAN-8
        if (!validarCodigoBarras(codigo)) {
            throw new Exception("El código de barras no es válido según el algoritmo EAN-8");
        }

        // Verificar que el código no esté ya asignado a otro producto
        Optional<Producto> productoExistente = productoRepository.findByCodigoBarras(codigo);
        if (productoExistente.isPresent()) {
            throw new Exception("El código de barras ya está asignado a un producto");
        }

        // Verificar que el código no esté asignado a otra variante
        Optional<ProductoVariante> varianteExistente = productoVarianteRepository.findByCodigoBarrasVariante(codigo);
        if (varianteExistente.isPresent() && !varianteExistente.get().getIdProductoVariante().equals(idVariante)) {
            throw new Exception("El código de barras ya está asignado a otra variante de producto");
        }

        // Asignar el código a la variante
        variante.setCodigoBarrasVariante(codigo);
        return productoVarianteRepository.save(variante);
    }

    @Override
    public String leerCodigoBarras(byte[] imagenBytes) throws IOException, Exception {
        ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(imagenBytes);
        BufferedImage bufferedImage = ImageIO.read(byteArrayInputStream);

        if (bufferedImage == null) {
            throw new IOException("No se pudo leer la imagen");
        }

        // Configurar el lector de códigos
        LuminanceSource source = new BufferedImageLuminanceSource(bufferedImage);
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

        Map<DecodeHintType, Object> hints = new HashMap<>();
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        hints.put(DecodeHintType.POSSIBLE_FORMATS, java.util.Arrays.asList(BarcodeFormat.EAN_8, BarcodeFormat.CODE_128));

        try {
            Result result = new MultiFormatReader().decode(bitmap, hints);
            return result.getText();
        } catch (NotFoundException e) {
            throw new Exception("No se pudo encontrar un código de barras en la imagen");
        }
    }

    @Override
    public Producto buscarPorCodigoBarras(String codigo) throws Exception {
        return productoRepository.findByCodigoBarras(codigo)
                .orElseThrow(() -> new Exception("No se encontró un producto con el código de barras: " + codigo));
    }

    @Override
    public ProductoVariante buscarVariantePorCodigoBarras(String codigo) throws Exception {
        return productoVarianteRepository.findByCodigoBarrasVariante(codigo)
                .orElseThrow(() -> new Exception("No se encontró una variante de producto con el código de barras: " + codigo));
    }

    @Override
    public int calcularDigitoVerificador(String codigo) {
        if (codigo.length() != 7 || !codigo.matches("\\d{7}")) {
            throw new IllegalArgumentException("El código base debe tener 7 dígitos numéricos");
        }

        int suma = 0;
        for (int i = 0; i < codigo.length(); i++) {
            int digito = Character.getNumericValue(codigo.charAt(i));
            suma += (i % 2 == 0) ? digito : digito * 3; // Multiplicar por 3 las posiciones pares (0-based)
        }

        int residuo = suma % 10;
        return (residuo == 0) ? 0 : 10 - residuo; // El dígito verificador
    }

    @Override
    public boolean validarCodigoBarras(String codigo) {
        if (codigo.length() != 8 || !codigo.matches("\\d{8}")) {
            return false;
        }

        String codigoBase = codigo.substring(0, 7);
        int digitoVerificador = Character.getNumericValue(codigo.charAt(7));
        int digitoCalculado = calcularDigitoVerificador(codigoBase);

        return digitoVerificador == digitoCalculado;
    }

    @Override
    public byte[] generarCodigoBarrasProducto(Long idProducto) throws Exception {
        BufferedImage imagen = generarCodigoBarras(idProducto, 300, 100);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", baos);
        return baos.toByteArray();
    }

    @Override
    public byte[] generarCodigoBarrasVariante(Long idVariante) throws Exception {
        BufferedImage imagen = generarCodigoBarrasVariante(idVariante, 300, 100);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", baos);
        return baos.toByteArray();
    }

    /**
     * Método auxiliar para generar la imagen del código de barras
     */
    private BufferedImage generarImagenCodigoBarras(String codigo, Integer ancho, Integer alto) throws Exception {
        // Valores por defecto si no se proporcionan
        int width = (ancho != null && ancho > 0) ? ancho : 300;
        int height = (alto != null && alto > 0) ? alto : 100;

        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.MARGIN, 0);

        BitMatrix bitMatrix;
        try {
            if (codigo.length() == 8 && codigo.matches("\\d{8}")) {
                // Si es un código EAN-8
                EAN8Writer ean8Writer = new EAN8Writer();
                bitMatrix = ean8Writer.encode(codigo, BarcodeFormat.EAN_8, width, height, hints);
            } else {
                // Para otros formatos usar Code128
                Code128Writer code128Writer = new Code128Writer();
                bitMatrix = code128Writer.encode(codigo, BarcodeFormat.CODE_128, width, height, hints);
            }

            return MatrixToImageWriter.toBufferedImage(bitMatrix);
        } catch (Exception e) {
            throw new Exception("Error al generar la imagen del código de barras: " + e.getMessage());
        }
    }

    /**
     * Método auxiliar para generar código de barras con texto descriptivo
     * Incluye el nombre del producto y detalles de la variante
     */
    private BufferedImage generarCodigoBarrasConTexto(String codigo, String descripcion, int ancho, int alto) throws Exception {
        // Generar la imagen del código de barras (más pequeña para dejar espacio al texto)
        BufferedImage codigoImagen = generarImagenCodigoBarras(codigo, ancho, alto - 40); // Reservar 40px para texto

        // Crear imagen más grande para incluir texto
        BufferedImage imagenCompleta = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = imagenCompleta.createGraphics();

        // Configurar renderizado para texto de alta calidad
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        // Fondo blanco
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, ancho, alto);

        // Dibujar el código de barras centrado en la parte superior
        int x = (ancho - codigoImagen.getWidth()) / 2;
        g2d.drawImage(codigoImagen, x, 5, null);

        // Configurar fuente para la descripción
        Font font = new Font("Arial", Font.BOLD, 10);
        g2d.setFont(font);
        g2d.setColor(Color.BLACK);

        // Dividir el texto si es muy largo
        FontMetrics fontMetrics = g2d.getFontMetrics();
        String[] lineas = dividirTexto(descripcion, fontMetrics, ancho - 20);

        // Dibujar cada línea de texto
        int yInicial = codigoImagen.getHeight() + 20;
        for (int i = 0; i < lineas.length; i++) {
            String linea = lineas[i];
            int textWidth = fontMetrics.stringWidth(linea);
            int textX = (ancho - textWidth) / 2;
            int textY = yInicial + (i * fontMetrics.getHeight());
            g2d.drawString(linea, textX, textY);
        }

        g2d.dispose();
        return imagenCompleta;
    }

    /**
     * Divide un texto en múltiples líneas si es muy largo para el ancho disponible
     */
    private String[] dividirTexto(String texto, FontMetrics fontMetrics, int anchoMaximo) {
        if (fontMetrics.stringWidth(texto) <= anchoMaximo) {
            return new String[]{texto};
        }

        // Si el texto es muy largo, dividirlo en dos líneas
        String[] palabras = texto.split(" - ");
        if (palabras.length >= 2) {
            // Primera línea: nombre del producto
            String linea1 = palabras[0];
            // Segunda línea: talla y color
            StringBuilder linea2 = new StringBuilder();
            for (int i = 1; i < palabras.length; i++) {
                if (i > 1) linea2.append(" - ");
                linea2.append(palabras[i]);
            }
            return new String[]{linea1, linea2.toString()};
        }

        return new String[]{texto};
    }
}
