-- Inserción de nuevo usuario Almacenero 2 corregida
-- Asegura que el rol ALMACENERO existe
INSERT INTO rol (nombre_rol)
SELECT 'ALMACENERO'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre_rol = 'ALMACENERO');

-- Intentar añadir restricción UNIQUE si no existe (buena práctica para el futuro)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_usuario_key') THEN
        ALTER TABLE usuario ADD CONSTRAINT usuario_usuario_key UNIQUE (usuario);
    END IF;
END $$;

-- Inserta el usuario con la contraseña proporcionada (Prueba123!) usando SELECT WHERE NOT EXISTS
INSERT INTO usuario (usuario, password, activo)
SELECT 'almacenero 2', '$2a$12$W/8YD6dO98WFdHuKfKugE.sa8WX11zH2AqeuN/Nvkc5uas/6PclrC', true
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE usuario = 'almacenero 2');

-- Asigna el rol ALMACENERO al nuevo usuario
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM usuario u, rol r
WHERE u.usuario = 'almacenero 2' 
AND r.nombre_rol = 'ALMACENERO'
AND NOT EXISTS (
    SELECT 1 FROM usuario_rol ur 
    WHERE ur.id_usuario = u.id_usuario AND ur.id_rol = r.id_rol
);
