-- Migración para agregar campos tipo_publico y sub_categoria2 a la tabla producto
-- Fecha: 2025-07-04
-- Descripción: Añade campos obligatorios tipo_publico y id_sub_categoria2

-- Verificar que la tabla producto existe
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'producto';

-- Agregar el campo tipo_publico (NIÑO o ADULTO)
ALTER TABLE producto 
ADD COLUMN tipo_publico VARCHAR(10) NOT NULL DEFAULT 'ADULTO' AFTER sexo;

-- Agregar el campo id_sub_categoria2 (referencia obligatoria a categoria)
ALTER TABLE producto 
ADD COLUMN id_sub_categoria2 BIGINT NULL AFTER id_subcategoria;

-- Crear la clave foránea para id_sub_categoria2
ALTER TABLE producto 
ADD CONSTRAINT fk_producto_sub_categoria2 
FOREIGN KEY (id_sub_categoria2) REFERENCES categoria(id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Opcional: Actualizar productos existentes con valores por defecto
-- (Descomentar y ejecutar solo si tienes productos existentes que necesitan valores por defecto)

-- UPDATE producto 
-- SET tipo_publico = 'ADULTO' 
-- WHERE tipo_publico IS NULL OR tipo_publico = '';

-- UPDATE producto 
-- SET id_sub_categoria2 = (SELECT id_categoria FROM categoria LIMIT 1)
-- WHERE id_sub_categoria2 IS NULL;

-- Hacer el campo id_sub_categoria2 NOT NULL después de asignar valores por defecto
ALTER TABLE producto 
MODIFY COLUMN id_sub_categoria2 BIGINT NOT NULL;

-- Verificar que los campos se agregaron correctamente
DESCRIBE producto;

-- Mostrar las restricciones de clave foránea
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'producto' 
AND REFERENCED_TABLE_NAME IS NOT NULL;
