package com.tienda.ropa.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Normaliza fragmentos para SKU (sin tildes, espacios ni caracteres no alfanuméricos).
 */
public final class SkuNormalizer {

    private static final Pattern NON_ALNUM = Pattern.compile("[^A-Za-z0-9]+");

    private SkuNormalizer() {}

    public static String normalizeToken(String input) {
        if (input == null) {
            return "";
        }
        String nfd = Normalizer.normalize(input.trim(), Normalizer.Form.NFD);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < nfd.length(); i++) {
            char c = nfd.charAt(i);
            if (Character.getType(c) != Character.NON_SPACING_MARK) {
                sb.append(c);
            }
        }
        String folded = sb.toString();
        return NON_ALNUM.matcher(folded).replaceAll("").toUpperCase();
    }

    /**
     * SKU estable: base del producto + tokens color/talla + id variante (unicidad).
     */
    public static String buildSku(String codigoIdentificacionProducto, String color, String talla, Long idVariante) {
        String base = normalizeToken(codigoIdentificacionProducto == null ? "SKU" : codigoIdentificacionProducto);
        if (base.isEmpty()) {
            base = "SKU";
        }
        String c = normalizeToken(color);
        String t = normalizeToken(talla);
        return base + "-" + c + "-" + t + "-" + idVariante;
    }
}
