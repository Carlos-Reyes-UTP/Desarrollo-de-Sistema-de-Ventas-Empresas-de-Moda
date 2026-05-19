-- Opción B: inventario por variante y ubicación; color/talla como texto en producto_variante.
-- Compatible con bases que aún tienen tablas color/talla (post V5) o ya migradas parcialmente.

-- 1) Tablas nuevas
CREATE TABLE IF NOT EXISTS ubicacion (
    id_ubicacion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    area VARCHAR(120),
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS inventario_ubicacion (
    id_inventario_ubicacion BIGSERIAL PRIMARY KEY,
    id_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante) ON DELETE CASCADE,
    id_ubicacion BIGINT NOT NULL REFERENCES ubicacion (id_ubicacion) ON DELETE RESTRICT,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    stock_maximo INTEGER,
    CONSTRAINT uq_inventario_variante_ubicacion UNIQUE (id_variante, id_ubicacion),
    CONSTRAINT chk_stock_actual_nonneg CHECK (stock_actual >= 0),
    CONSTRAINT chk_stock_min_nonneg CHECK (stock_minimo >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventario_ubicacion_variante ON inventario_ubicacion (id_variante);
CREATE INDEX IF NOT EXISTS idx_inventario_ubicacion_ubicacion ON inventario_ubicacion (id_ubicacion);

CREATE TABLE IF NOT EXISTS solicitud (
    id_solicitud BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario (id_usuario),
    tipo_solicitud VARCHAR(32) NOT NULL,
    estado VARCHAR(32) NOT NULL,
    id_ubicacion_origen BIGINT NOT NULL REFERENCES ubicacion (id_ubicacion),
    id_ubicacion_destino BIGINT NOT NULL REFERENCES ubicacion (id_ubicacion),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitud_fecha ON solicitud (fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_solicitud_estado ON solicitud (estado);

CREATE TABLE IF NOT EXISTS detalle_solicitud (
    id_detalle_solicitud BIGSERIAL PRIMARY KEY,
    id_solicitud BIGINT NOT NULL REFERENCES solicitud (id_solicitud) ON DELETE CASCADE,
    id_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    cantidad INTEGER NOT NULL,
    CONSTRAINT chk_detalle_solicitud_cantidad_pos CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS idx_detalle_solicitud_solicitud ON detalle_solicitud (id_solicitud);

-- 2) Ubicación por defecto
INSERT INTO ubicacion (nombre, area, descripcion)
SELECT 'Principal', 'TIENDA', 'Stock principal tras migración inventario por ubicación'
WHERE NOT EXISTS (SELECT 1 FROM ubicacion WHERE nombre = 'Principal');

-- 3) Catálogo producto: descripción opcional
ALTER TABLE producto ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 4) Columnas en variante (texto + sku + codigo_barras en la variante)
ALTER TABLE producto_variante ADD COLUMN IF NOT EXISTS color VARCHAR(160);
ALTER TABLE producto_variante ADD COLUMN IF NOT EXISTS talla VARCHAR(120);
ALTER TABLE producto_variante ADD COLUMN IF NOT EXISTS sku VARCHAR(220);
ALTER TABLE producto_variante ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(160);

-- 5) Función auxiliar: token SKU (sin tildes, sin espacios, solo alfanuméricos mayúsculas)
CREATE OR REPLACE FUNCTION tmp_sku_token(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $fn$
SELECT upper(
    regexp_replace(
        translate(
            coalesce(input_text, ''),
            'áàäâãéèëêíìïîóòöôõúùüûñÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ',
            'aaaaaeeeeeiiiiiooooouuuunAAAAAEEEEEIIIIIOOOOOUUUUN'
        ),
        '[^a-zA-Z0-9]+',
        '',
        'g'
    )
);
$fn$;

-- 6) Rellenar color/talla desde tablas maestras si aún existen FKs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'producto_variante' AND column_name = 'id_color'
    ) THEN
        EXECUTE $q$
            UPDATE producto_variante pv
            SET
                color = COALESCE(c.nombre, pv.color, 'Sin color'),
                talla = COALESCE(t.nombre_talla, pv.talla, 'Única')
            FROM color c, talla t
            WHERE pv.id_color = c.id_color AND pv.id_talla = t.id_talla
        $q$;
    END IF;
END $$;

UPDATE producto_variante
SET color = COALESCE(NULLIF(trim(color), ''), 'Único')
WHERE color IS NULL;

UPDATE producto_variante
SET talla = COALESCE(NULLIF(trim(talla), ''), 'Única')
WHERE talla IS NULL;

-- 7) codigo_barras en variante (antes codigo_barras_variante)
UPDATE producto_variante
SET codigo_barras = codigo_barras_variante
WHERE codigo_barras IS NULL
  AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'producto_variante' AND column_name = 'codigo_barras_variante'
  )
  AND codigo_barras_variante IS NOT NULL;

-- 8) SKU estable: codigo_identificacion + tokens(color,talla) + id (garantiza unicidad)
UPDATE producto_variante pv
SET sku = regexp_replace(translate(coalesce(p.codigo_identificacion, 'SKU'), 'áàäâãéèëêíìïîóòöôõúùüûñÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ', 'aaaaaeeeeeiiiiiooooouuuunAAAAAEEEEEIIIIIOOOOOUUUUN'), '[^a-zA-Z0-9]+', '', 'g')
      || '-' || tmp_sku_token(pv.color) || '-' || tmp_sku_token(pv.talla) || '-' || pv.id_producto_variante::text
FROM producto p
WHERE p.id_producto = pv.id_producto
  AND pv.sku IS NULL;

-- 9) Poblar inventario desde stock por variante (ubicación Principal)
INSERT INTO inventario_ubicacion (id_variante, id_ubicacion, stock_actual, stock_minimo, stock_maximo)
SELECT pv.id_producto_variante,
       u.id_ubicacion,
       GREATEST(COALESCE(pv.cantidad, 0), 0),
       0,
       NULL
FROM producto_variante pv
CROSS JOIN (SELECT id_ubicacion FROM ubicacion WHERE nombre = 'Principal' ORDER BY id_ubicacion LIMIT 1) u
WHERE NOT EXISTS (
    SELECT 1 FROM inventario_ubicacion iu
    WHERE iu.id_variante = pv.id_producto_variante AND iu.id_ubicacion = u.id_ubicacion
);

-- 10) Índices / columnas legacy
DROP INDEX IF EXISTS idx_producto_variante_producto_talla_color;

DROP INDEX IF EXISTS idx_producto_variante_codigo_barras;

-- 11) Quitar FKs y columnas id_color / id_talla / codigo_barras_variante
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class rel ON rel.oid = c.conrelid
        JOIN pg_class ref ON ref.oid = c.confrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'producto_variante'
          AND c.contype = 'f'
          AND ref.relname IN ('color', 'talla')
    LOOP
        EXECUTE format('ALTER TABLE producto_variante DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE producto_variante DROP COLUMN IF EXISTS id_color;
ALTER TABLE producto_variante DROP COLUMN IF EXISTS id_talla;
ALTER TABLE producto_variante DROP COLUMN IF EXISTS codigo_barras_variante;

-- Evitar duplicados en codigo_barras antes del índice único parcial
UPDATE producto_variante pv
SET codigo_barras = COALESCE(pv.codigo_barras, 'GEN') || '-' || pv.id_producto_variante::text
WHERE pv.codigo_barras IS NULL;

UPDATE producto_variante pv
SET codigo_barras = pv.codigo_barras || '-' || pv.id_producto_variante::text
WHERE EXISTS (
    SELECT 1
    FROM producto_variante o
    WHERE o.codigo_barras = pv.codigo_barras
      AND o.id_producto_variante < pv.id_producto_variante
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_variante_sku ON producto_variante (sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_variante_codigo_barras
    ON producto_variante (codigo_barras)
    WHERE codigo_barras IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_producto_variante_color_talla ON producto_variante (id_producto, talla, color);

DROP FUNCTION IF EXISTS tmp_sku_token(TEXT);

-- 12) Eliminar tablas maestras si existen
DROP TABLE IF EXISTS color CASCADE;
DROP TABLE IF EXISTS talla CASCADE;

-- 13) Usuario técnico SISTEMA (opcional, para FK futuras; password dummy no usado en login)
INSERT INTO usuario (usuario, password, activo)
SELECT 'SISTEMA',
       '$2a$12$W/8YD6dO98WFdHuKfKugE.sa8WX11zH2AqeuN/Nvkc5uas/6PclrC',
       false
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE usuario = 'SISTEMA');
