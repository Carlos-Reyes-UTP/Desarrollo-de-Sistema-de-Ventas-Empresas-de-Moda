-- Unifica VENDEDOR_CAMPO en VENDEDOR: datos, fila de rol y CHECK de nombre_rol.

-- Asegurar que existe el rol VENDEDOR antes de reasignar.
INSERT INTO rol (nombre_rol)
SELECT 'VENDEDOR'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'VENDEDOR');

-- Usuarios con solo VENDEDOR_CAMPO reciben también VENDEDOR (sin duplicar par usuario+rol).
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT DISTINCT ur.id_usuario, r_v.id_rol
FROM usuario_rol ur
INNER JOIN rol r_c ON r_c.id_rol = ur.id_rol AND r_c.nombre_rol = 'VENDEDOR_CAMPO'
INNER JOIN rol r_v ON r_v.nombre_rol = 'VENDEDOR'
WHERE NOT EXISTS (
    SELECT 1 FROM usuario_rol ur2
    WHERE ur2.id_usuario = ur.id_usuario AND ur2.id_rol = r_v.id_rol
);

DELETE FROM usuario_rol
WHERE id_rol IN (SELECT id_rol FROM rol WHERE nombre_rol = 'VENDEDOR_CAMPO');

DELETE FROM rol WHERE nombre_rol = 'VENDEDOR_CAMPO';

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
    nombre_rol IN ('ADMIN', 'ALMACENERO', 'CAJERO', 'VENDEDOR')
);
