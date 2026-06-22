ALTER TABLE solicitud ADD COLUMN id_usuario_atendio BIGINT;
ALTER TABLE solicitud ADD CONSTRAINT fk_solicitud_usuario_atendio FOREIGN KEY (id_usuario_atendio) REFERENCES usuario(id_usuario);
