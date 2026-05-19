-- Área de catálogo General (almacenero con acceso a todos los sectores) y usuario demo.

INSERT INTO area (nombre)
SELECT 'General'
WHERE NOT EXISTS (
    SELECT 1 FROM area a WHERE LOWER(TRIM(a.nombre)) = 'general'
);

INSERT INTO ubicacion_area (id_ubicacion, id_area)
SELECT u.id_ubicacion, a.id_area
FROM ubicacion u
CROSS JOIN area a
WHERE LOWER(TRIM(u.nombre)) IN ('almacen', 'almacén')
  AND LOWER(TRIM(a.nombre)) = 'general'
  AND NOT EXISTS (
      SELECT 1 FROM ubicacion_area ua
      WHERE ua.id_ubicacion = u.id_ubicacion AND ua.id_area = a.id_area
  );

INSERT INTO usuario (usuario, password, activo, id_ubicacion_area_asignada)
SELECT 'almacenero general',
       '$2a$12$2oBvFiHyS6SMDVS4XY2WXupfUeYeQ4tY/XuxTMBhHjRsn3PLqg3Ie',
       true,
       ua.id_ubicacion_area
FROM ubicacion_area ua
JOIN ubicacion u ON u.id_ubicacion = ua.id_ubicacion
JOIN area a ON a.id_area = ua.id_area
WHERE LOWER(TRIM(u.nombre)) IN ('almacen', 'almacén')
  AND LOWER(TRIM(a.nombre)) = 'general'
  AND NOT EXISTS (SELECT 1 FROM usuario x WHERE x.usuario = 'almacenero general');

UPDATE usuario u
SET id_ubicacion_area_asignada = ua.id_ubicacion_area
FROM ubicacion_area ua
JOIN ubicacion ub ON ub.id_ubicacion = ua.id_ubicacion
JOIN area ar ON ar.id_area = ua.id_area
WHERE u.usuario = 'almacenero general'
  AND LOWER(TRIM(ub.nombre)) IN ('almacen', 'almacén')
  AND LOWER(TRIM(ar.nombre)) = 'general'
  AND (u.id_ubicacion_area_asignada IS DISTINCT FROM ua.id_ubicacion_area);

INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM usuario u
JOIN rol r ON r.nombre_rol = 'ALMACENERO'
WHERE u.usuario = 'almacenero general'
  AND NOT EXISTS (
      SELECT 1 FROM usuario_rol ur
      WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
  );
