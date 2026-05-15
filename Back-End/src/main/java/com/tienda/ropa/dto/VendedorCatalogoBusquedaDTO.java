package com.tienda.ropa.dto;

import java.util.List;

/**
 * Resultado de búsqueda de catálogo: un catálogo listo o varias coincidencias para que elija el vendedor.
 */
public record VendedorCatalogoBusquedaDTO(
        boolean multiresultado,
        List<VendedorVarianteCoincidenciaDTO> opciones,
        VendedorCatalogoPorCodigoDTO catalogo
) {}
