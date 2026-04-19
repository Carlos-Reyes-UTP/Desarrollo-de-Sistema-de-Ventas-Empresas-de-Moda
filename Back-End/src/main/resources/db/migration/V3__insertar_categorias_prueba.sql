-- Script para insertar categorías de prueba con IDs dinámicos
-- Las categorías padre (Hombre, Mujer, Niño) ya deben existir

-- 1. Crear categorías padre si no existen
INSERT INTO categoria (nombre, categoria_padre_id) 
SELECT 'Hombre', NULL WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL);

INSERT INTO categoria (nombre, categoria_padre_id) 
SELECT 'Mujer', NULL WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL);

INSERT INTO categoria (nombre, categoria_padre_id) 
SELECT 'Niño', NULL WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL);

-- 2. Crear subcategorías de HOMBRE
WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Camisas', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Camisas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Polos', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Polos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Pantalones', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Pantalones' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Shorts', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Shorts' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Chaquetas', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Chaquetas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Zapatos', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Zapatos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

WITH padre_hombre AS (SELECT id_categoria FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Accesorios', id_categoria FROM padre_hombre
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Accesorios' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_hombre));

-- 3. Crear subcategorías de MUJER
WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Blusas', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Blusas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Camisas', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Camisas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Vestidos', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Vestidos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Pantalones', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Pantalones' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Faldas', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Faldas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Chaquetas', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Chaquetas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Zapatos', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Zapatos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

WITH padre_mujer AS (SELECT id_categoria FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Accesorios', id_categoria FROM padre_mujer
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Accesorios' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_mujer));

-- 4. Crear subcategorías de NIÑO
WITH padre_nino AS (SELECT id_categoria FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Camisas', id_categoria FROM padre_nino
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Camisas' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_nino));

WITH padre_nino AS (SELECT id_categoria FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Polos', id_categoria FROM padre_nino
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Polos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_nino));

WITH padre_nino AS (SELECT id_categoria FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Pantalones', id_categoria FROM padre_nino
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Pantalones' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_nino));

WITH padre_nino AS (SELECT id_categoria FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Shorts', id_categoria FROM padre_nino
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Shorts' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_nino));

WITH padre_nino AS (SELECT id_categoria FROM categoria WHERE nombre = 'Niño' AND categoria_padre_id IS NULL)
INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Zapatos', id_categoria FROM padre_nino
WHERE NOT EXISTS (SELECT 1 FROM categoria c 
    WHERE c.nombre = 'Zapatos' AND c.categoria_padre_id = (SELECT id_categoria FROM padre_nino));