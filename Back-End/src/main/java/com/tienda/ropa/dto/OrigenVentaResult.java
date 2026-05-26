package com.tienda.ropa.dto;

import com.tienda.ropa.entity.OrigenVenta;
import com.tienda.ropa.entity.UbicacionArea;

public record OrigenVentaResult(UbicacionArea ubicacionArea, OrigenVenta tipoOrigen) {}
