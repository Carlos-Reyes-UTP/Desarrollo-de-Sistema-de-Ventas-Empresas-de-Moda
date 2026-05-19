-- Inserta usuarios administrador y cajero con sus roles (idempotente).
-- No modifica V2 para evitar checksum mismatch en BD existentes.

-- Roles
INSERT INTO rol (nombre_rol)
SELECT 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'ADMIN');

INSERT INTO rol (nombre_rol)
SELECT 'CAJERO'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'CAJERO');

-- Usuarios
INSERT INTO usuario (usuario, password, activo)
SELECT 'administrador', '$2a$12$oo2eZU6MGJUNjN.bu9UiNO4iwfDdM52RAC.KVBhRq6v4.XHhb90mS', true
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE usuario = 'administrador');

INSERT INTO usuario (usuario, password, activo)
SELECT 'cajero', '$2a$12$oo2eZU6MGJUNjN.bu9UiNO4iwfDdM52RAC.KVBhRq6v4.XHhb90mS', true
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE usuario = 'cajero');

-- Asignación de roles
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM usuario u, rol r
WHERE u.usuario = 'administrador' AND r.nombre_rol = 'ADMIN'
AND NOT EXISTS (
    SELECT 1 FROM usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
);

INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM usuario u, rol r
WHERE u.usuario = 'cajero' AND r.nombre_rol = 'CAJERO'
AND NOT EXISTS (
    SELECT 1 FROM usuario_rol ur
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
);
