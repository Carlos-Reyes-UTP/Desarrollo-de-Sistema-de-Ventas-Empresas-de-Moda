-- Baseline idempotente: tablas que antes se creaban manualmente o con Hibernate.
-- Permite que Flyway V1..V13 se ejecuten en una base PostgreSQL vacía.
-- No crea caja/movimiento_caja (V1), ni inventario por ubicación (V7): esas migraciones siguen siendo la fuente de verdad.

CREATE TABLE IF NOT EXISTS rol (
    id_rol       BIGSERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    usuario    VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    activo     BOOLEAN NOT NULL DEFAULT TRUE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuario_usuario_key'
    ) THEN
        ALTER TABLE usuario ADD CONSTRAINT usuario_usuario_key UNIQUE (usuario);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario BIGINT NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    id_rol     BIGINT NOT NULL REFERENCES rol (id_rol) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(255),
    ruc          VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS categoria (
    id_categoria        BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(255),
    categoria_padre_id  BIGINT REFERENCES categoria (id_categoria)
);

CREATE TABLE IF NOT EXISTS producto (
    id_producto          BIGSERIAL PRIMARY KEY,
    codigo_identificacion VARCHAR(255) NOT NULL UNIQUE,
    codigo_barras         VARCHAR(255) UNIQUE,
    nombre                VARCHAR(255) NOT NULL,
    descripcion           TEXT,
    sexo                  VARCHAR(50) NOT NULL,
    tipo_publico          VARCHAR(50) NOT NULL,
    id_subcategoria       BIGINT REFERENCES categoria (id_categoria),
    id_sub_categoria2     BIGINT REFERENCES categoria (id_categoria),
    id_categoria_padre    BIGINT NOT NULL REFERENCES categoria (id_categoria),
    marca                 VARCHAR(255) NOT NULL,
    id_proveedor          BIGINT NOT NULL REFERENCES proveedores (id_proveedor),
    precio_unitario       NUMERIC(14, 2) NOT NULL,
    precio_cuarto         NUMERIC(14, 2),
    precio_media_docena   NUMERIC(14, 2),
    precio_docena         NUMERIC(14, 2),
    cantidad              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS color (
    id_color BIGSERIAL PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS talla (
    id_talla     BIGSERIAL PRIMARY KEY,
    nombre_talla VARCHAR(120) NOT NULL UNIQUE
);

-- Forma legacy requerida por V5 y migrada por V7 (color/talla en texto, sin id_color/id_talla).
CREATE TABLE IF NOT EXISTS producto_variante (
    id_producto_variante  BIGSERIAL PRIMARY KEY,
    id_producto           BIGINT NOT NULL REFERENCES producto (id_producto) ON DELETE CASCADE,
    id_color              BIGINT NOT NULL REFERENCES color (id_color),
    id_talla              BIGINT NOT NULL REFERENCES talla (id_talla),
    cantidad              INTEGER NOT NULL DEFAULT 0,
    codigo_barras_variante VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente        BIGSERIAL PRIMARY KEY,
    nombre_cliente    VARCHAR(255) NOT NULL,
    tipo_cliente      VARCHAR(50) NOT NULL,
    numero_documento  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mayorista (
    id_cliente       BIGINT PRIMARY KEY REFERENCES cliente (id_cliente) ON DELETE CASCADE,
    codigo_mayorista VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS venta (
    id_venta         BIGSERIAL PRIMARY KEY,
    id_usuario       BIGINT NOT NULL REFERENCES usuario (id_usuario),
    id_cliente       BIGINT NOT NULL REFERENCES cliente (id_cliente),
    metodo_pago      VARCHAR(50) NOT NULL,
    tipo_comprobante VARCHAR(50) NOT NULL,
    fecha_venta      TIMESTAMP NOT NULL,
    total_ventas     NUMERIC(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta       BIGSERIAL PRIMARY KEY,
    id_venta               BIGINT NOT NULL REFERENCES venta (id_venta) ON DELETE CASCADE,
    id_producto_variante   BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    cantidad               INTEGER NOT NULL,
    precio_unitario        NUMERIC(14, 2) NOT NULL
);
