package com.tienda.ropa.dto;

import java.util.List;

/**
 * Contexto de inventario para el usuario autenticado en el módulo almacén.
 */
public record InventarioContextoDTO(
        String rolPrincipal,
        Long idUbicacionAreaAsignada,
        String etiquetaAreaAsignada,
        boolean puedeElegirAreaEntrada,
        boolean restriccionTrasladoMismaAreaCatalogo,
        List<String> sectoresVisibles,
        List<UbicacionDTO> areasAlmacen,
        List<UbicacionDTO> destinosTraslado
) {}
