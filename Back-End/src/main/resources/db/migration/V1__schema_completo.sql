-- Esquema consolidado (estado final post-V17/V18). Instalación nueva: sin modelo legacy ubicacion(nombre, area).

-- ========== Seguridad y usuarios ==========
CREATE TABLE rol (
    id_rol       BIGSERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50) NOT NULL UNIQUE,
    CONSTRAINT rol_nombre_rol_check CHECK (
        nombre_rol IN (
            'ADMIN', 'ALMACENERO', 'CAJERO', 'VENDEDOR', 'GERENTE', 'SUPERVISOR_ALMACEN'
        )
    )
);

CREATE TABLE usuario (
    id_usuario                  BIGSERIAL PRIMARY KEY,
    usuario                     VARCHAR(255) NOT NULL UNIQUE,
    password                    VARCHAR(255) NOT NULL,
    activo                      BOOLEAN NOT NULL DEFAULT TRUE,
    id_ubicacion_area_asignada  BIGINT NULL
);

CREATE TABLE usuario_rol (
    id_usuario BIGINT NOT NULL REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    id_rol     BIGINT NOT NULL REFERENCES rol (id_rol) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

-- ========== Catálogo ==========
CREATE TABLE proveedores (
    id_proveedor BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(255),
    ruc          VARCHAR(100) UNIQUE
);

CREATE TABLE categoria (
    id_categoria       BIGSERIAL PRIMARY KEY,
    nombre             VARCHAR(255),
    categoria_padre_id BIGINT REFERENCES categoria (id_categoria)
);

CREATE TABLE producto (
    id_producto           BIGSERIAL PRIMARY KEY,
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

CREATE TABLE producto_variante (
    id_producto_variante BIGSERIAL PRIMARY KEY,
    id_producto          BIGINT NOT NULL REFERENCES producto (id_producto) ON DELETE CASCADE,
    color                VARCHAR(160) NOT NULL,
    talla                VARCHAR(120) NOT NULL,
    sku                  VARCHAR(220),
    codigo_barras        VARCHAR(160),
    cantidad             INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uq_producto_variante_sku ON producto_variante (sku);
CREATE UNIQUE INDEX uq_producto_variante_codigo_barras
    ON producto_variante (codigo_barras)
    WHERE codigo_barras IS NOT NULL;
CREATE INDEX idx_producto_variante_color_talla ON producto_variante (id_producto, talla, color);
CREATE INDEX idx_producto_variante_id_producto ON producto_variante (id_producto);

CREATE INDEX idx_producto_nombre ON producto (nombre);
CREATE INDEX idx_producto_codigo_identificacion ON producto (codigo_identificacion);
CREATE INDEX idx_producto_codigo_barras ON producto (codigo_barras);

-- ========== Clientes y ventas ==========
CREATE TABLE cliente (
    id_cliente       BIGSERIAL PRIMARY KEY,
    nombre_cliente   VARCHAR(255) NOT NULL,
    tipo_cliente     VARCHAR(50) NOT NULL,
    numero_documento VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE mayorista (
    id_cliente       BIGINT PRIMARY KEY REFERENCES cliente (id_cliente) ON DELETE CASCADE,
    codigo_mayorista VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE venta (
    id_venta         BIGSERIAL PRIMARY KEY,
    id_usuario       BIGINT NOT NULL REFERENCES usuario (id_usuario),
    id_cliente       BIGINT NOT NULL REFERENCES cliente (id_cliente),
    metodo_pago      VARCHAR(50) NOT NULL,
    tipo_comprobante VARCHAR(50) NOT NULL,
    fecha_venta      TIMESTAMP NOT NULL,
    total_ventas     NUMERIC(14, 2) NOT NULL
);

CREATE TABLE detalle_venta (
    id_detalle_venta     BIGSERIAL PRIMARY KEY,
    id_venta             BIGINT NOT NULL REFERENCES venta (id_venta) ON DELETE CASCADE,
    id_producto_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    cantidad             INTEGER NOT NULL,
    precio_unitario      NUMERIC(14, 2) NOT NULL
);

-- ========== Caja ==========
CREATE TABLE caja (
    id_caja                 BIGSERIAL PRIMARY KEY,
    id_usuario              BIGINT NOT NULL REFERENCES usuario (id_usuario),
    fecha_apertura          TIMESTAMP NOT NULL,
    monto_apertura          DECIMAL(10, 2) NOT NULL,
    fecha_cierre            TIMESTAMP,
    monto_cierre            DECIMAL(10, 2),
    monto_ventas_efectivo   DECIMAL(10, 2) DEFAULT 0,
    monto_ventas_tarjeta    DECIMAL(10, 2) DEFAULT 0,
    monto_ventas_yape       DECIMAL(10, 2) DEFAULT 0,
    monto_esperado          DECIMAL(10, 2),
    discrepancia            DECIMAL(10, 2),
    observaciones           TEXT,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',
    numero_operacion        VARCHAR(50) UNIQUE
);

CREATE INDEX idx_caja_usuario_estado ON caja (id_usuario, estado);
CREATE INDEX idx_caja_fecha_apertura ON caja (fecha_apertura);

CREATE TABLE movimiento_caja (
    id_movimiento     BIGSERIAL PRIMARY KEY,
    id_caja           BIGINT NOT NULL REFERENCES caja (id_caja) ON DELETE CASCADE,
    tipo_movimiento   VARCHAR(20) NOT NULL,
    monto             DECIMAL(10, 2) NOT NULL,
    metodo_pago       VARCHAR(20),
    descripcion       TEXT,
    fecha_movimiento  TIMESTAMP NOT NULL,
    referencia_id     BIGINT
);

CREATE INDEX idx_movimiento_caja ON movimiento_caja (id_caja, fecha_movimiento);

-- ========== Inventario normalizado (piso + área catálogo) ==========
CREATE TABLE ubicacion (
    id_ubicacion BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX uq_ubicacion_nombre_norm ON ubicacion (LOWER(TRIM(nombre)));

CREATE TABLE area (
    id_area BIGSERIAL PRIMARY KEY,
    nombre  VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX uq_area_nombre_norm ON area (LOWER(TRIM(nombre)));

CREATE TABLE ubicacion_area (
    id_ubicacion_area BIGSERIAL PRIMARY KEY,
    id_ubicacion      BIGINT NOT NULL REFERENCES ubicacion (id_ubicacion) ON DELETE RESTRICT,
    id_area           BIGINT NOT NULL REFERENCES area (id_area) ON DELETE RESTRICT,
    CONSTRAINT uq_ubicacion_area_par UNIQUE (id_ubicacion, id_area)
);

CREATE INDEX idx_ubicacion_area_ubicacion ON ubicacion_area (id_ubicacion);
CREATE INDEX idx_ubicacion_area_area ON ubicacion_area (id_area);

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_ubicacion_area_asignada
        FOREIGN KEY (id_ubicacion_area_asignada) REFERENCES ubicacion_area (id_ubicacion_area);

CREATE TABLE inventario (
    id_inventario        BIGSERIAL PRIMARY KEY,
    id_ubicacion_area    BIGINT NOT NULL REFERENCES ubicacion_area (id_ubicacion_area) ON DELETE CASCADE,
    id_producto_variante BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante) ON DELETE CASCADE,
    stock                INTEGER NOT NULL DEFAULT 0,
    stock_minimo         INTEGER NOT NULL DEFAULT 0,
    stock_maximo         INTEGER,
    CONSTRAINT uq_inventario_variante_ubicacion_area UNIQUE (id_ubicacion_area, id_producto_variante),
    CONSTRAINT chk_inventario_stock_nonneg CHECK (stock >= 0),
    CONSTRAINT chk_inventario_stock_min_nonneg CHECK (stock_minimo >= 0)
);

CREATE INDEX idx_inventario_variante ON inventario (id_producto_variante);
CREATE INDEX idx_inventario_ubicacion_area ON inventario (id_ubicacion_area);

CREATE TABLE movimiento_inventario (
    id_movimiento_inventario BIGSERIAL PRIMARY KEY,
    id_producto_variante     BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    id_ubicacion_area_origen BIGINT REFERENCES ubicacion_area (id_ubicacion_area),
    id_ubicacion_area_destino BIGINT REFERENCES ubicacion_area (id_ubicacion_area),
    cantidad                 INTEGER NOT NULL,
    tipo_movimiento          VARCHAR(32) NOT NULL,
    CONSTRAINT chk_movimiento_inventario_cantidad_pos CHECK (cantidad > 0)
);

CREATE INDEX idx_movimiento_inventario_variante ON movimiento_inventario (id_producto_variante);

-- ========== Solicitudes almacén ==========
CREATE TABLE solicitud (
    id_solicitud               BIGSERIAL PRIMARY KEY,
    id_usuario                 BIGINT REFERENCES usuario (id_usuario),
    tipo_solicitud             VARCHAR(32) NOT NULL,
    estado                     VARCHAR(32) NOT NULL,
    id_ubicacion_area_origen   BIGINT NOT NULL REFERENCES ubicacion_area (id_ubicacion_area),
    id_ubicacion_area_destino  BIGINT NOT NULL REFERENCES ubicacion_area (id_ubicacion_area),
    fecha_creacion             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo_rechazo             VARCHAR(64) NULL,
    codigo_lote                VARCHAR(255) NULL
);

CREATE INDEX idx_solicitud_fecha ON solicitud (fecha_creacion);
CREATE INDEX idx_solicitud_estado ON solicitud (estado);
CREATE INDEX idx_solicitud_ubicacion_area_origen ON solicitud (id_ubicacion_area_origen);
CREATE INDEX idx_solicitud_ubicacion_area_destino ON solicitud (id_ubicacion_area_destino);

CREATE TABLE detalle_solicitud (
    id_detalle_solicitud BIGSERIAL PRIMARY KEY,
    id_solicitud         BIGINT NOT NULL REFERENCES solicitud (id_solicitud) ON DELETE CASCADE,
    id_variante          BIGINT NOT NULL REFERENCES producto_variante (id_producto_variante),
    cantidad             INTEGER NOT NULL,
    CONSTRAINT chk_detalle_solicitud_cantidad_pos CHECK (cantidad > 0)
);

CREATE INDEX idx_detalle_solicitud_solicitud ON detalle_solicitud (id_solicitud);

COMMENT ON COLUMN solicitud.motivo_rechazo IS 'SIN_STOCK_FISICO | PRENDA_DEFECTUOSA cuando estado=CANCELADO';
COMMENT ON COLUMN solicitud.codigo_lote IS 'Identificador de lote para agrupar solicitudes en un ticket de picking';
