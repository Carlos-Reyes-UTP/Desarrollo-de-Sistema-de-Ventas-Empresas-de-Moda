-- Elimina la ubicación "Principal" (obsoleta desde V9+V10) y migra su stock a Almacén.
-- Idempotente: si no existe Principal, no hace nada.
-- Compatible con BD nuevas (V7 crea Principal, V14 la elimina) y existentes.

DO $$
DECLARE
    v_id_principal BIGINT;
    v_id_almacen   BIGINT;
    r RECORD;
BEGIN
    -- Resolver IDs
    SELECT id_ubicacion INTO v_id_principal FROM ubicacion WHERE LOWER(TRIM(nombre)) = 'principal';
    SELECT id_ubicacion INTO v_id_almacen   FROM ubicacion WHERE LOWER(TRIM(nombre)) IN ('almacén', 'almacen', 'almacen');

    IF v_id_principal IS NULL THEN
        RAISE NOTICE 'Ubicación Principal no existe, nada que migrar.';
        RETURN;
    END IF;

    IF v_id_almacen IS NULL THEN
        RAISE EXCEPTION 'Ubicación Almacén no encontrada; ejecute la migración V9 primero.';
    END IF;

    -- Migrar stock de Principal → Almacén (sumando en caso de duplicado variante+ubicacion)
    FOR r IN
        SELECT iu.id_variante, iu.stock_actual
        FROM inventario_ubicacion iu
        WHERE iu.id_ubicacion = v_id_principal AND iu.stock_actual > 0
    LOOP
        INSERT INTO inventario_ubicacion (id_variante, id_ubicacion, stock_actual, stock_minimo, stock_maximo)
        VALUES (r.id_variante, v_id_almacen, r.stock_actual, 0, NULL)
        ON CONFLICT (id_variante, id_ubicacion)
        DO UPDATE SET stock_actual = inventario_ubicacion.stock_actual + r.stock_actual;
    END LOOP;

    -- Re-apuntar solicitudes que referencian Principal como origen o destino
    UPDATE solicitud SET id_ubicacion_origen  = v_id_almacen WHERE id_ubicacion_origen  = v_id_principal;
    UPDATE solicitud SET id_ubicacion_destino = v_id_almacen WHERE id_ubicacion_destino = v_id_principal;

    -- Eliminar registros de inventario que apuntaban a Principal
    DELETE FROM inventario_ubicacion WHERE id_ubicacion = v_id_principal;

    -- Eliminar la propia ubicación Principal
    DELETE FROM ubicacion WHERE id_ubicacion = v_id_principal;

    RAISE NOTICE 'Stock migrado de Principal → Almacén y ubicación Principal eliminada.';
END $$;
