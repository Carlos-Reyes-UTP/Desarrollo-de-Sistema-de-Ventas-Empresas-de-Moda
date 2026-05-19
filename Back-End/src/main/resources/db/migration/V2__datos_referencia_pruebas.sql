-- Datos de referencia para desarrollo y pruebas de stock por área.
-- Contraseña de todos los usuarios demo: Prueba123!
-- Hash BCrypt (cost 12): $2a$12$2oBvFiHyS6SMDVS4XY2WXupfUeYeQ4tY/XuxTMBhHjRsn3PLqg3Ie

-- ========== Roles ==========
INSERT INTO rol (nombre_rol)
SELECT v.nombre
FROM (VALUES
    ('ADMIN'),
    ('ALMACENERO'),
    ('CAJERO'),
    ('VENDEDOR'),
    ('GERENTE'),
    ('SUPERVISOR_ALMACEN')
) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM rol r WHERE r.nombre_rol = v.nombre);

-- ========== Pisos (ubicacion) ==========
INSERT INTO ubicacion (nombre)
SELECT v.nombre
FROM (VALUES
    ('Almacen'),
    ('Piso 1'),
    ('Piso 2')
) AS v(nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM ubicacion u WHERE LOWER(TRIM(u.nombre)) = LOWER(TRIM(v.nombre))
);

-- ========== Áreas de catálogo ==========
INSERT INTO area (nombre)
SELECT v.nombre
FROM (VALUES
    ('Damas'),
    ('Caballeros'),
    ('Niños')
) AS v(nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM area a WHERE LOWER(TRIM(a.nombre)) = LOWER(TRIM(v.nombre))
);

-- ========== Pares ubicacion_area ==========
-- Almacen: Damas, Caballeros, Niños
-- Piso 1: Damas, Caballeros, Niños
-- Piso 2: Damas, Niños (sin Caballeros)
INSERT INTO ubicacion_area (id_ubicacion, id_area)
SELECT u.id_ubicacion, a.id_area
FROM (VALUES
    ('Almacen', 'Damas'),
    ('Almacen', 'Caballeros'),
    ('Almacen', 'Niños'),
    ('Piso 1', 'Damas'),
    ('Piso 1', 'Caballeros'),
    ('Piso 1', 'Niños'),
    ('Piso 2', 'Damas'),
    ('Piso 2', 'Niños')
) AS v(piso, area)
JOIN ubicacion u ON LOWER(TRIM(u.nombre)) = LOWER(TRIM(v.piso))
JOIN area a ON LOWER(TRIM(a.nombre)) = LOWER(TRIM(v.area))
WHERE NOT EXISTS (
    SELECT 1 FROM ubicacion_area ua
    WHERE ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
);

-- ========== Usuarios demo (7) ==========
INSERT INTO usuario (usuario, password, activo, id_ubicacion_area_asignada)
SELECT v.usuario,
       '$2a$12$2oBvFiHyS6SMDVS4XY2WXupfUeYeQ4tY/XuxTMBhHjRsn3PLqg3Ie',
       true,
       ua.id_ubicacion_area
FROM (VALUES
    ('administrador', NULL::text, NULL::text),
    ('cajero', NULL, NULL),
    ('supervisor', NULL, NULL),
    ('vendedor', NULL, NULL),
    ('almacenero 1', 'Almacen', 'Damas'),
    ('almacenero 2', 'Almacen', 'Caballeros'),
    ('almacenero 3', 'Almacen', 'Niños')
) AS v(usuario, piso, area)
LEFT JOIN ubicacion u ON v.piso IS NOT NULL AND LOWER(TRIM(u.nombre)) = LOWER(TRIM(v.piso))
LEFT JOIN area a ON v.area IS NOT NULL AND LOWER(TRIM(a.nombre)) = LOWER(TRIM(v.area))
LEFT JOIN ubicacion_area ua ON ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
WHERE NOT EXISTS (SELECT 1 FROM usuario x WHERE x.usuario = v.usuario);

-- Sincronizar contraseña y asignación de área en usuarios ya existentes
UPDATE usuario
SET password = '$2a$12$2oBvFiHyS6SMDVS4XY2WXupfUeYeQ4tY/XuxTMBhHjRsn3PLqg3Ie'
WHERE usuario IN (
    'administrador', 'cajero', 'supervisor', 'vendedor',
    'almacenero 1', 'almacenero 2', 'almacenero 3'
);

UPDATE usuario u
SET id_ubicacion_area_asignada = ua.id_ubicacion_area
FROM (VALUES
    ('almacenero 1', 'Almacen', 'Damas'),
    ('almacenero 2', 'Almacen', 'Caballeros'),
    ('almacenero 3', 'Almacen', 'Niños')
) AS m(usuario, piso, area)
JOIN ubicacion ub ON LOWER(TRIM(ub.nombre)) = LOWER(TRIM(m.piso))
JOIN area ar ON LOWER(TRIM(ar.nombre)) = LOWER(TRIM(m.area))
JOIN ubicacion_area ua ON ua.id_ubicacion = ub.id_ubicacion AND ua.id_area = ar.id_area
WHERE u.usuario = m.usuario
  AND (u.id_ubicacion_area_asignada IS DISTINCT FROM ua.id_ubicacion_area);

UPDATE usuario
SET id_ubicacion_area_asignada = NULL
WHERE usuario IN ('administrador', 'cajero', 'supervisor', 'vendedor')
  AND id_ubicacion_area_asignada IS NOT NULL;

-- ========== Asignación usuario_rol ==========
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM (VALUES
    ('administrador', 'ADMIN'),
    ('cajero', 'CAJERO'),
    ('supervisor', 'SUPERVISOR_ALMACEN'),
    ('vendedor', 'VENDEDOR'),
    ('almacenero 1', 'ALMACENERO'),
    ('almacenero 2', 'ALMACENERO'),
    ('almacenero 3', 'ALMACENERO')
) AS m(usuario, rol)
JOIN usuario u ON u.usuario = m.usuario
JOIN rol r ON r.nombre_rol = m.rol
WHERE NOT EXISTS (
    SELECT 1 FROM usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
);
