-- Umbrales de inventario por ubicacion_area (lógica de reposición automática).
-- Sin migración de valores históricos: DEFAULT 0 y NULL para filas existentes.

ALTER TABLE inventario
    ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_maximo INTEGER;

ALTER TABLE inventario DROP CONSTRAINT IF EXISTS chk_inventario_stock_min_nonneg;
ALTER TABLE inventario ADD CONSTRAINT chk_inventario_stock_min_nonneg
    CHECK (stock_minimo >= 0);
