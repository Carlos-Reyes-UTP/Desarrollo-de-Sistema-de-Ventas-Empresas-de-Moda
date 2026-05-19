-- Script V4 original dummy para que Flyway pase la validación
CREATE OR REPLACE FUNCTION generar_productos_prueba()
RETURNS void
LANGUAGE plpgsql
AS $FUNC$
BEGIN
    RAISE NOTICE 'Skipping V4';
END;
$FUNC$;
SELECT generar_productos_prueba();
DROP FUNCTION generar_productos_prueba();