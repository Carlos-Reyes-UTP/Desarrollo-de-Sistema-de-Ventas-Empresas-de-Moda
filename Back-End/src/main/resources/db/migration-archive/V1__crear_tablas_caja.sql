-- Sistema de Caja
-- V1__crear_tablas_caja.sql

-- Tabla caja
CREATE TABLE caja (
    id_caja BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL REFERENCES usuario(id_usuario),
    fecha_apertura TIMESTAMP NOT NULL,
    monto_apertura DECIMAL(10,2) NOT NULL,
    fecha_cierre TIMESTAMP,
    monto_cierre DECIMAL(10,2),
    monto_ventas_efectivo DECIMAL(10,2) DEFAULT 0,
    monto_ventas_tarjeta DECIMAL(10,2) DEFAULT 0,
    monto_ventas_yape DECIMAL(10,2) DEFAULT 0,
    monto_esperado DECIMAL(10,2),
    discrepancia DECIMAL(10,2),
    observaciones TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',
    numero_operacion VARCHAR(50) UNIQUE
);

CREATE INDEX idx_caja_usuario_estado ON caja(id_usuario, estado);
CREATE INDEX idx_caja_fecha_apertura ON caja(fecha_apertura);

-- Tabla movimiento_caja
CREATE TABLE movimiento_caja (
    id_movimiento BIGSERIAL PRIMARY KEY,
    id_caja BIGINT NOT NULL REFERENCES caja(id_caja) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20),
    descripcion TEXT,
    fecha_movimiento TIMESTAMP NOT NULL,
    referencia_id BIGINT
);

CREATE INDEX idx_movimiento_caja ON movimiento_caja(id_caja, fecha_movimiento);