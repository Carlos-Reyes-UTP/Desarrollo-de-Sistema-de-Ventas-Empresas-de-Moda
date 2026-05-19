package com.tienda.ropa.dto;

public record VendedorVarianteStockDTO(
        Long idProductoVariante,
        String talla,
        String color,
        String codigoBarras,
        /** Stock físico en sectores de almacén (suma por línea si hay destino conocido). */
        int stockAlmacen,
        /** Unidades apartadas en solicitudes VENTA PENDIENTE. */
        int stockReservado,
        /** stockAlmacen − stockReservado (mínimo 0). */
        int stockDisponible,
        /** Área destino conocida para esta variante. Null si nunca salió del almacén. */
        Long idUbicacionAreaDestino,
        /** Nombre legible del área destino. Null si no está asignada. */
        String nombreUbicacion
) {}
