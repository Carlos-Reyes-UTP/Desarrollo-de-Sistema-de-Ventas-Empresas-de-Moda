-- Índices para mejorar carga y búsqueda de productos/variantes en alto volumen.
-- Compatible con PostgreSQL.

CREATE INDEX IF NOT EXISTS idx_producto_nombre
    ON producto (nombre);

CREATE INDEX IF NOT EXISTS idx_producto_codigo_identificacion
    ON producto (codigo_identificacion);

CREATE INDEX IF NOT EXISTS idx_producto_codigo_barras
    ON producto (codigo_barras);

CREATE INDEX IF NOT EXISTS idx_producto_variante_codigo_barras
    ON producto_variante (codigo_barras_variante);

CREATE INDEX IF NOT EXISTS idx_producto_variante_id_producto
    ON producto_variante (id_producto);

CREATE INDEX IF NOT EXISTS idx_producto_variante_producto_talla_color
    ON producto_variante (id_producto, id_talla, id_color);
