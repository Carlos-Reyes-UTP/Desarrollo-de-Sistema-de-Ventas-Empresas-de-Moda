-- Rol adicional: vendedor de campo (enum en aplicación: VENDEDOR_CAMPO)
-- Ampliar el CHECK existente sobre nombre_rol (nombres alineados con enum Role en Java).

DO $$
DECLARE
    cname text;
BEGIN
    FOR cname IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'rol'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%nombre_rol%'
    LOOP
        EXECUTE format('ALTER TABLE rol DROP CONSTRAINT IF EXISTS %I', cname);
    END LOOP;
END $$;

ALTER TABLE rol ADD CONSTRAINT rol_nombre_rol_check CHECK (
    nombre_rol IN ('ADMIN', 'ALMACENERO', 'CAJERO', 'VENDEDOR_CAMPO')
);

INSERT INTO rol (nombre_rol)
SELECT 'VENDEDOR_CAMPO'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'VENDEDOR_CAMPO');
