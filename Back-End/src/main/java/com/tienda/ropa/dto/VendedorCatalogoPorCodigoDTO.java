package com.tienda.ropa.dto;

import java.util.List;

public record VendedorCatalogoPorCodigoDTO(
        VendedorProductoResumenDTO producto,
        Long idVariantePreseleccionada,
        List<VendedorVarianteStockDTO> variantes
) {}
