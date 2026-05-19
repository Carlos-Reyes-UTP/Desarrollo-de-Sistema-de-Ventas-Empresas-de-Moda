-- Catálogo mínimo para probar formularios sin carga masiva (variantes con color/talla texto).

INSERT INTO proveedores (nombre, ruc)
SELECT 'Proveedor Demo', '20100000001'
WHERE NOT EXISTS (SELECT 1 FROM proveedores WHERE ruc = '20100000001');

INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Hombre', NULL
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Hombre' AND categoria_padre_id IS NULL);

INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Mujer', NULL
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nombre = 'Mujer' AND categoria_padre_id IS NULL);

INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Camisas', c.id_categoria
FROM categoria c
WHERE c.nombre = 'Hombre' AND c.categoria_padre_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM categoria sub
      WHERE sub.nombre = 'Camisas' AND sub.categoria_padre_id = c.id_categoria
  );

INSERT INTO categoria (nombre, categoria_padre_id)
SELECT 'Blusas', c.id_categoria
FROM categoria c
WHERE c.nombre = 'Mujer' AND c.categoria_padre_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM categoria sub
      WHERE sub.nombre = 'Blusas' AND sub.categoria_padre_id = c.id_categoria
  );

INSERT INTO producto (
    codigo_identificacion, nombre, descripcion, sexo, tipo_publico,
    id_categoria_padre, id_subcategoria, marca, id_proveedor, precio_unitario, cantidad
)
SELECT
    'DEMO-CAM-001',
    'Camisa demo caballero',
    'Producto de prueba línea caballero',
    'MASCULINO',
    'ADULTO',
    padre.id_categoria,
    sub.id_categoria,
    'Marca Demo',
    p.id_proveedor,
    49.90,
    0
FROM categoria padre
JOIN categoria sub ON sub.nombre = 'Camisas' AND sub.categoria_padre_id = padre.id_categoria
JOIN proveedores p ON p.ruc = '20100000001'
WHERE padre.nombre = 'Hombre' AND padre.categoria_padre_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM producto pr WHERE pr.codigo_identificacion = 'DEMO-CAM-001');

INSERT INTO producto (
    codigo_identificacion, nombre, descripcion, sexo, tipo_publico,
    id_categoria_padre, id_subcategoria, marca, id_proveedor, precio_unitario, cantidad
)
SELECT
    'DEMO-BLU-001',
    'Blusa demo dama',
    'Producto de prueba línea dama',
    'FEMENINO',
    'ADULTO',
    padre.id_categoria,
    sub.id_categoria,
    'Marca Demo',
    p.id_proveedor,
    39.90,
    0
FROM categoria padre
JOIN categoria sub ON sub.nombre = 'Blusas' AND sub.categoria_padre_id = padre.id_categoria
JOIN proveedores p ON p.ruc = '20100000001'
WHERE padre.nombre = 'Mujer' AND padre.categoria_padre_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM producto pr WHERE pr.codigo_identificacion = 'DEMO-BLU-001');

INSERT INTO producto_variante (id_producto, color, talla, sku, codigo_barras, cantidad)
SELECT pr.id_producto, 'Azul', 'M', 'DEMO-CAM-001-AZ-M', '7890001000001', 0
FROM producto pr
WHERE pr.codigo_identificacion = 'DEMO-CAM-001'
  AND NOT EXISTS (SELECT 1 FROM producto_variante pv WHERE pv.sku = 'DEMO-CAM-001-AZ-M');

INSERT INTO producto_variante (id_producto, color, talla, sku, codigo_barras, cantidad)
SELECT pr.id_producto, 'Blanco', 'L', 'DEMO-CAM-001-BL-L', '7890001000002', 0
FROM producto pr
WHERE pr.codigo_identificacion = 'DEMO-CAM-001'
  AND NOT EXISTS (SELECT 1 FROM producto_variante pv WHERE pv.sku = 'DEMO-CAM-001-BL-L');

INSERT INTO producto_variante (id_producto, color, talla, sku, codigo_barras, cantidad)
SELECT pr.id_producto, 'Rojo', 'S', 'DEMO-BLU-001-RO-S', '7890002000001', 0
FROM producto pr
WHERE pr.codigo_identificacion = 'DEMO-BLU-001'
  AND NOT EXISTS (SELECT 1 FROM producto_variante pv WHERE pv.sku = 'DEMO-BLU-001-RO-S');
