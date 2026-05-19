-- Normaliza inventario: ubicacion (piso) + area + ubicacion_area + inventario + movimiento_inventario.
-- Migra datos desde ubicacion_legacy / inventario_ubicacion_legacy y actualiza solicitud / usuario / roles.

-- 1) Renombrar tablas legado
ALTER TABLE ubicacion RENAME TO ubicacion_legacy;
ALTER TABLE inventario_ubicacion RENAME TO inventario_ubicacion_legacy;

-- 2) Nuevo esquema
CREATE TABLE ubicacion (
    id_ubicacion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX uq_ubicacion_nombre_norm ON ubicacion (LOWER(TRIM(nombre)));

CREATE TABLE area (
    id_area BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX uq_area_nombre_norm ON area (LOWER(TRIM(nombre)));

CREATE TABLE ubicacion_area (
    id_ubicacion_area BIGSERIAL PRIMARY KEY,
    id_ubicacion BIGINT NOT NULL REFERENCES ubicacion (id_ubicacion) ON DELETE RESTRICT,
    id_area BIGINT NOT NULL REFERENCES area (id_area) ON DELETE RESTRICT,
    CONSTRAINT uq_ubicacion_area_par UNIQUE (id_ubicacion, id_area)
);

CREATE INDEX idx_ubicacion_area_ubicacion ON ubicacion_area (id_ubicacion);
CREATE INDEX idx_ubicacion_area_area ON ubicacion_area (id_area);

CREATE TABLE inventario (
    id_inventario BIGSERIAL PRIMARY KEY,
    id_ubicacion_area BIGINT NOT NULL REFERENCES ubicacion_area (id_ubicacion_area) ON DELETE CASCADE,
    id_producto_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_inventario_variante_ubicacion_area UNIQUE (id_ubicacion_area, id_producto_variante),
    CONSTRAINT chk_inventario_stock_nonneg CHECK (stock >= 0)
);

CREATE INDEX idx_inventario_variante ON inventario (id_producto_variante);
CREATE INDEX idx_inventario_ubicacion_area ON inventario (id_ubicacion_area);

CREATE TABLE movimiento_inventario (
    id_movimiento_inventario BIGSERIAL PRIMARY KEY,
    id_producto_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    id_ubicacion_area_origen BIGINT REFERENCES ubicacion_area (id_ubicacion_area),
    id_ubicacion_area_destino BIGINT REFERENCES ubicacion_area (id_ubicacion_area),
    cantidad INTEGER NOT NULL,
    tipo_movimiento VARCHAR(32) NOT NULL,
    CONSTRAINT chk_movimiento_inventario_cantidad_pos CHECK (cantidad > 0)
);

CREATE INDEX idx_movimiento_inventario_variante ON movimiento_inventario (id_producto_variante);

-- 3) ETL desde legado
INSERT INTO ubicacion (nombre)
SELECT DISTINCT TRIM(ul.nombre)
FROM ubicacion_legacy ul
WHERE TRIM(ul.nombre) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM ubicacion u WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(ul.nombre))
  );

INSERT INTO area (nombre)
SELECT DISTINCT COALESCE(NULLIF(TRIM(ul.area), ''), 'General')
FROM ubicacion_legacy ul
WHERE NOT EXISTS (
    SELECT 1 FROM area a
    WHERE LOWER(TRIM(a.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(ul.area), ''), 'General')))
);

INSERT INTO ubicacion_area (id_ubicacion, id_area)
SELECT DISTINCT u.id_ubicacion, a.id_area
FROM ubicacion_legacy ul
INNER JOIN ubicacion u ON LOWER(TRIM(u.nombre)) = LOWER(TRIM(ul.nombre))
INNER JOIN area a ON LOWER(TRIM(a.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(ul.area), ''), 'General')))
WHERE NOT EXISTS (
    SELECT 1 FROM ubicacion_area ua
    WHERE ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
);

-- Semilla Almacén si no existe par lógico
INSERT INTO ubicacion (nombre)
SELECT 'Almacén'
WHERE NOT EXISTS (SELECT 1 FROM ubicacion WHERE LOWER(TRIM(nombre)) IN ('almacén', 'almacen'));

INSERT INTO area (nombre)
SELECT 'General'
WHERE NOT EXISTS (SELECT 1 FROM area WHERE LOWER(TRIM(nombre)) = 'general');

INSERT INTO ubicacion_area (id_ubicacion, id_area)
SELECT u.id_ubicacion, a.id_area
FROM ubicacion u
CROSS JOIN area a
WHERE LOWER(TRIM(u.nombre)) IN ('almacén', 'almacen')
  AND LOWER(TRIM(a.nombre)) = 'general'
  AND NOT EXISTS (
      SELECT 1 FROM ubicacion_area ua
      WHERE ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
  );

INSERT INTO inventario (id_ubicacion_area, id_producto_variante, stock)
SELECT ua.id_ubicacion_area, iul.id_variante, COALESCE(iul.stock_actual, 0)
FROM inventario_ubicacion_legacy iul
INNER JOIN ubicacion_legacy ul ON ul.id_ubicacion = iul.id_ubicacion
INNER JOIN ubicacion u ON LOWER(TRIM(u.nombre)) = LOWER(TRIM(ul.nombre))
INNER JOIN area a ON LOWER(TRIM(a.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(ul.area), ''), 'General')))
INNER JOIN ubicacion_area ua ON ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
ON CONFLICT (id_ubicacion_area, id_producto_variante) DO UPDATE
    SET stock = EXCLUDED.stock;

-- 4) solicitud → ubicacion_area
ALTER TABLE solicitud ADD COLUMN id_ubicacion_area_origen BIGINT;
ALTER TABLE solicitud ADD COLUMN id_ubicacion_area_destino BIGINT;

UPDATE solicitud s
SET id_ubicacion_area_origen = sub.id_ubicacion_area
FROM (
    SELECT s2.id_solicitud, ua.id_ubicacion_area
    FROM solicitud s2
    INNER JOIN ubicacion_legacy ul ON ul.id_ubicacion = s2.id_ubicacion_origen
    INNER JOIN ubicacion u ON LOWER(TRIM(u.nombre)) = LOWER(TRIM(ul.nombre))
    INNER JOIN area a ON LOWER(TRIM(a.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(ul.area), ''), 'General')))
    INNER JOIN ubicacion_area ua ON ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
) sub
WHERE s.id_solicitud = sub.id_solicitud;

UPDATE solicitud s
SET id_ubicacion_area_destino = sub.id_ubicacion_area
FROM (
    SELECT s2.id_solicitud, ua.id_ubicacion_area
    FROM solicitud s2
    INNER JOIN ubicacion_legacy ul ON ul.id_ubicacion = s2.id_ubicacion_destino
    INNER JOIN ubicacion u ON LOWER(TRIM(u.nombre)) = LOWER(TRIM(ul.nombre))
    INNER JOIN area a ON LOWER(TRIM(a.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(ul.area), ''), 'General')))
    INNER JOIN ubicacion_area ua ON ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
) sub
WHERE s.id_solicitud = sub.id_solicitud;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM solicitud
        WHERE id_ubicacion_area_origen IS NULL OR id_ubicacion_area_destino IS NULL
    ) THEN
        RAISE EXCEPTION 'Migración V17: solicitud con origen/destino sin mapear a ubicacion_area';
    END IF;
END $$;

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
          AND rel.relname = 'solicitud'
          AND con.contype = 'f'
          AND (
              pg_get_constraintdef(con.oid) ILIKE '%id_ubicacion_origen%'
              OR pg_get_constraintdef(con.oid) ILIKE '%id_ubicacion_destino%'
          )
    LOOP
        EXECUTE format('ALTER TABLE solicitud DROP CONSTRAINT IF EXISTS %I', cname);
    END LOOP;
END $$;

ALTER TABLE solicitud DROP COLUMN id_ubicacion_origen;
ALTER TABLE solicitud DROP COLUMN id_ubicacion_destino;

ALTER TABLE solicitud
    ALTER COLUMN id_ubicacion_area_origen SET NOT NULL,
    ALTER COLUMN id_ubicacion_area_destino SET NOT NULL;

ALTER TABLE solicitud
    ADD CONSTRAINT fk_solicitud_ubicacion_area_origen
        FOREIGN KEY (id_ubicacion_area_origen) REFERENCES ubicacion_area (id_ubicacion_area),
    ADD CONSTRAINT fk_solicitud_ubicacion_area_destino
        FOREIGN KEY (id_ubicacion_area_destino) REFERENCES ubicacion_area (id_ubicacion_area);

CREATE INDEX idx_solicitud_ubicacion_area_origen ON solicitud (id_ubicacion_area_origen);
CREATE INDEX idx_solicitud_ubicacion_area_destino ON solicitud (id_ubicacion_area_destino);

-- 5) usuario.area_asignado
ALTER TABLE usuario
    ADD COLUMN id_ubicacion_area_asignada BIGINT NULL
        REFERENCES ubicacion_area (id_ubicacion_area);

-- 6) Roles GERENTE y SUPERVISOR_ALMACEN (ampliar CHECK antes de insertar)
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

INSERT INTO rol (nombre_rol)
SELECT 'GERENTE'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'GERENTE');

INSERT INTO rol (nombre_rol)
SELECT 'SUPERVISOR_ALMACEN'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'SUPERVISOR_ALMACEN');

ALTER TABLE rol ADD CONSTRAINT rol_nombre_rol_check CHECK (
    nombre_rol IN (
        'ADMIN', 'ALMACENERO', 'CAJERO', 'VENDEDOR', 'GERENTE', 'SUPERVISOR_ALMACEN'
    )
);

-- 7) Eliminar legado
DROP TABLE inventario_ubicacion_legacy;
DROP TABLE ubicacion_legacy;
