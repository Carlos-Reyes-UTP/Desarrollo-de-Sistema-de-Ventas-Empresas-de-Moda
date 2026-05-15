-- Ubicación de almacén por defecto para reposición automática (origen → Principal).
INSERT INTO ubicacion (nombre, area, descripcion)
SELECT 'Almacén', 'ALMACEN', 'Stock de respaldo; origen de solicitudes de reposición automáticas'
WHERE NOT EXISTS (
    SELECT 1 FROM ubicacion WHERE LOWER(TRIM(nombre)) IN ('almacén', 'almacen')
);
