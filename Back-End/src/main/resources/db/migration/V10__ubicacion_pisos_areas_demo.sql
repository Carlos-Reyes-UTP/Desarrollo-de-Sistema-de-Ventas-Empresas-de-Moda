-- Semilla idempotente de pisos y áreas de ejemplo para el módulo almacenero.
-- Solo inserta si la fila (nombre, area) aún no existe; los nombres
-- 'Principal' y 'Almacén' se excluyen automáticamente del listado de pisos
-- en el backend (UbicacionService.listarPisos).
INSERT INTO ubicacion (nombre, area, descripcion)
SELECT v.nombre, v.area, v.descripcion
FROM (
    VALUES
        ('Piso 1', 'Vitrina',  'Área de exhibición principal del piso 1'),
        ('Piso 1', 'Probador', 'Stock cercano al probador del piso 1'),
        ('Piso 2', 'Vitrina',  'Área de exhibición principal del piso 2'),
        ('Piso 2', 'Bodega',   'Bodega interna del piso 2')
) AS v(nombre, area, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM ubicacion u
    WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(v.nombre))
      AND LOWER(TRIM(COALESCE(u.area, ''))) = LOWER(TRIM(COALESCE(v.area, '')))
);
