-- Motivo de rechazo (almacén): solo relevante cuando estado = CANCELADO
ALTER TABLE solicitud
    ADD COLUMN IF NOT EXISTS motivo_rechazo VARCHAR(64) NULL;

COMMENT ON COLUMN solicitud.motivo_rechazo IS 'SIN_STOCK_FISICO | PRENDA_DEFECTUOSA cuando estado=CANCELADO';
