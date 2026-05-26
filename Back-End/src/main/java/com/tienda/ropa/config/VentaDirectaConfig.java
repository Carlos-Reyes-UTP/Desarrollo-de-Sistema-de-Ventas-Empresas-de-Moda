package com.tienda.ropa.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "venta.directa")
public record VentaDirectaConfig(boolean habilitada) {}
