-- Soft-disable para estructura de almacén (pisos, áreas, ubicaciones operativas)
ALTER TABLE ubicacion ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE area ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ubicacion_area ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_ubicacion_activo ON ubicacion (activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_area_activo ON area (activo) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_ubicacion_area_activo ON ubicacion_area (activo) WHERE activo = TRUE;
