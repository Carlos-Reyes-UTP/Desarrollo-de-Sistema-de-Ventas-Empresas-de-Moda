-- Script para actualizar las categorías principales existentes
-- Este script asegura que las categorías que deberían ser principales 
-- tengan categoria_padre_id como NULL

-- Primero, vamos a verificar el estado actual
SELECT id_categoria, nombre, categoria_padre_id 
FROM categoria 
ORDER BY categoria_padre_id NULLS FIRST;

-- Actualizar las categorías que parecen ser principales para que tengan categoria_padre_id como NULL
-- Basándonos en la lista que proporcionaste, estas categorías deberían ser principales:

UPDATE categoria 
SET categoria_padre_id = NULL 
WHERE nombre IN (
    'Ropa de Verano',
    'Ropa de Invierno', 
    'Ropa de Otoño',
    'Polos',
    'Short',
    'Gorras',
    'Ropa Interior'
) AND categoria_padre_id IS NOT NULL;

-- Verificar los cambios
SELECT id_categoria, nombre, categoria_padre_id 
FROM categoria 
WHERE categoria_padre_id IS NULL
ORDER BY id_categoria;

-- Consulta para ver la estructura jerárquica completa
SELECT 
    c1.id_categoria as principal_id,
    c1.nombre as principal_nombre,
    c2.id_categoria as subcategoria_id,
    c2.nombre as subcategoria_nombre,
    c3.id_categoria as sub_subcategoria_id,
    c3.nombre as sub_subcategoria_nombre
FROM categoria c1
LEFT JOIN categoria c2 ON c2.categoria_padre_id = c1.id_categoria
LEFT JOIN categoria c3 ON c3.categoria_padre_id = c2.id_categoria
WHERE c1.categoria_padre_id IS NULL
ORDER BY c1.id_categoria, c2.id_categoria, c3.id_categoria;
