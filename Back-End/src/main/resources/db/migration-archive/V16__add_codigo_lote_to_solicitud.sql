-- Migración para añadir el soporte de agrupamiento por lotes/tickets
ALTER TABLE solicitud ADD COLUMN codigo_lote VARCHAR(255);

-- Comentario para auditoría
COMMENT ON COLUMN solicitud.codigo_lote IS 'Identificador de lote para agrupar múltiples solicitudes en un solo ticket de picking';
