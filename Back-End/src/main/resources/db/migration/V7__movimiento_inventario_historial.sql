-- Agrega soporte de auditoría al historial de movimiento_inventario
ALTER TABLE movimiento_inventario ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE movimiento_inventario ADD COLUMN IF NOT EXISTS id_usuario BIGINT REFERENCES usuario (id_usuario);
ALTER TABLE movimiento_inventario ADD COLUMN IF NOT EXISTS id_grupo_movimiento UUID;

CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_fecha ON movimiento_inventario (fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_grupo ON movimiento_inventario (id_grupo_movimiento);
