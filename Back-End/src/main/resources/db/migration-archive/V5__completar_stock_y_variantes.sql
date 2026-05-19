-- Script V5: Añadir VARIANTES y STOCK real a los productos existentes
CREATE OR REPLACE FUNCTION completar_stock_variantes()
RETURNS void
LANGUAGE plpgsql
AS $FUNC$
DECLARE
    rec RECORD;
    i INTEGER;
    color_ids BIGINT[];
    talla_ids BIGINT[];
    temp_id BIGINT;
    marca_val TEXT;
BEGIN
    -- 1. Asegurar Colores
    FOR marca_val IN SELECT unnest(ARRAY['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Gris']) LOOP
        INSERT INTO color (nombre) VALUES (marca_val) ON CONFLICT DO NOTHING;
        SELECT id_color INTO temp_id FROM color WHERE nombre = marca_val LIMIT 1;
        color_ids := array_append(color_ids, temp_id);
    END LOOP;

    -- 2. Asegurar Tallas
    FOR marca_val IN SELECT unnest(ARRAY['S', 'M', 'L', 'XL', '30', '32', '34']) LOOP
        INSERT INTO talla (nombre_talla) VALUES (marca_val) ON CONFLICT DO NOTHING;
        SELECT id_talla INTO temp_id FROM talla WHERE nombre_talla = marca_val LIMIT 1;
        talla_ids := array_append(talla_ids, temp_id);
    END LOOP;

    -- 3. Crear 3 variantes para CADA producto que no tenga variantes aún
    FOR rec IN SELECT id_producto, codigo_identificacion FROM producto LOOP
        IF NOT EXISTS (SELECT 1 FROM producto_variante WHERE id_producto = rec.id_producto) THEN
            FOR i IN 1..3 LOOP
                INSERT INTO producto_variante (id_producto, id_color, id_talla, cantidad, codigo_barras_variante)
                VALUES (
                    rec.id_producto, 
                    color_ids[floor(random() * array_length(color_ids, 1))::int + 1],
                    talla_ids[floor(random() * array_length(talla_ids, 1))::int + 1],
                    floor(random() * 30 + 10)::int, -- Stock entre 10 y 40
                    'VAR-' || rec.id_producto || '-' || i
                );
            END LOOP;
        END IF;
    END LOOP;
END;
$FUNC$;

SELECT completar_stock_variantes();
DROP FUNCTION completar_stock_variantes();
