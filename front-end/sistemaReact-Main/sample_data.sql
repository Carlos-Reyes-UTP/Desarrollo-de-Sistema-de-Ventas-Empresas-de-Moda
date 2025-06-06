-- Sample data for ventasApp-tiendas MySQL database
-- This file contains sample categories, providers, and products

-- First, let's add some categories
INSERT INTO categorias (nombre, es_categoria_principal, tiene_subcategorias) VALUES
('Ropa Masculina', true, true),
('Ropa Femenina', true, true),
('Calzado', true, true),
('Accesorios', true, true),
('Deportivo', true, true);

-- Add some subcategories
INSERT INTO categorias (nombre, categoria_padre_id, es_categoria_principal, tiene_subcategorias) VALUES
('Camisas', 1, false, false),
('Pantalones', 1, false, false),
('Blusas', 2, false, false),
('Vestidos', 2, false, false),
('Zapatos Formales', 3, false, false),
('Zapatillas', 3, false, false),
('Relojes', 4, false, false),
('Carteras', 4, false, false);

-- Add some providers
INSERT INTO proveedores (nombre, ruc) VALUES
('Distribuidora Fashion SAC', '20123456789'),
('Importaciones Style EIRL', '20987654321'),
('Calzados del Norte SRL', '20456789123'),
('Accesorios Premium SAC', '20789123456'),
('Deportes y Más SAC', '20321654987');

-- Add sample products
INSERT INTO productos (codigo_identificacion, nombre, sexo, categoria_id, talla, marca, color, proveedor_id, cantidad, precio_unitario, precio_cuarto, precio_media_docena, precio_docena) VALUES

-- Ropa Masculina - Camisas
('CAM001', 'Camisa Manga Larga Azul', 'MASCULINO', 6, 'M', 'Elite Fashion', 'Azul', 1, 25, 45.00, 40.00, 38.00, 35.00),
('CAM002', 'Camisa Manga Larga Blanca', 'MASCULINO', 6, 'L', 'Elite Fashion', 'Blanco', 1, 30, 45.00, 40.00, 38.00, 35.00),
('CAM003', 'Camisa Manga Corta Celeste', 'MASCULINO', 6, 'M', 'Style Pro', 'Celeste', 2, 20, 35.00, 32.00, 30.00, 28.00),
('CAM004', 'Camisa Casual Gris', 'MASCULINO', 6, 'XL', 'Elite Fashion', 'Gris', 1, 15, 50.00, 45.00, 42.00, 40.00),

-- Ropa Masculina - Pantalones
('PAN001', 'Pantalón Jean Azul', 'MASCULINO', 7, '32', 'Denim Pro', 'Azul', 1, 18, 65.00, 60.00, 55.00, 50.00),
('PAN002', 'Pantalón Formal Negro', 'MASCULINO', 7, '34', 'Executive', 'Negro', 2, 22, 70.00, 65.00, 62.00, 58.00),
('PAN003', 'Pantalón Khaki Beige', 'MASCULINO', 7, '36', 'Casual Wear', 'Beige', 1, 12, 55.00, 50.00, 48.00, 45.00),

-- Ropa Femenina - Blusas
('BLU001', 'Blusa Manga Larga Rosa', 'FEMENINO', 8, 'S', 'Feminine Style', 'Rosa', 2, 28, 38.00, 35.00, 32.00, 30.00),
('BLU002', 'Blusa Sin Mangas Blanca', 'FEMENINO', 8, 'M', 'Chic Collection', 'Blanco', 1, 35, 32.00, 28.00, 26.00, 24.00),
('BLU003', 'Blusa Estampada Multicolor', 'FEMENINO', 8, 'L', 'Fashion Trends', 'Multicolor', 2, 20, 42.00, 38.00, 36.00, 34.00),

-- Ropa Femenina - Vestidos
('VES001', 'Vestido Casual Azul', 'FEMENINO', 9, 'S', 'Elegant Wear', 'Azul', 2, 15, 85.00, 80.00, 75.00, 70.00),
('VES002', 'Vestido Formal Negro', 'FEMENINO', 9, 'M', 'Executive Lady', 'Negro', 1, 12, 120.00, 115.00, 110.00, 105.00),
('VES003', 'Vestido Verano Amarillo', 'FEMENINO', 9, 'L', 'Summer Collection', 'Amarillo', 2, 18, 65.00, 60.00, 55.00, 52.00),

-- Calzado - Zapatos Formales
('ZAP001', 'Zapatos Oxford Negro', 'MASCULINO', 10, '42', 'Classic Shoes', 'Negro', 3, 10, 120.00, 115.00, 110.00, 105.00),
('ZAP002', 'Zapatos Oxford Marrón', 'MASCULINO', 10, '43', 'Classic Shoes', 'Marrón', 3, 8, 125.00, 120.00, 115.00, 110.00),
('ZAP003', 'Zapatos Tacón Negro', 'FEMENINO', 10, '37', 'Elegant Steps', 'Negro', 3, 14, 95.00, 90.00, 85.00, 80.00),
('ZAP004', 'Zapatos Tacón Rojo', 'FEMENINO', 10, '38', 'Elegant Steps', 'Rojo', 3, 12, 95.00, 90.00, 85.00, 80.00),

-- Calzado - Zapatillas
('ZPT001', 'Zapatillas Deportivas Blancas', 'UNISEX', 11, '40', 'Sport Max', 'Blanco', 5, 25, 75.00, 70.00, 65.00, 60.00),
('ZPT002', 'Zapatillas Running Negras', 'UNISEX', 11, '41', 'Sport Max', 'Negro', 5, 30, 85.00, 80.00, 75.00, 70.00),
('ZPT003', 'Zapatillas Casual Azules', 'MASCULINO', 11, '42', 'Urban Style', 'Azul', 3, 22, 65.00, 60.00, 55.00, 50.00),
('ZPT004', 'Zapatillas Fashion Rosa', 'FEMENINO', 11, '36', 'Trendy Shoes', 'Rosa', 3, 18, 70.00, 65.00, 60.00, 55.00),

-- Accesorios - Relojes
('REL001', 'Reloj Digital Deportivo', 'UNISEX', 12, 'UNICA', 'TimePro', 'Negro', 4, 15, 45.00, 42.00, 40.00, 38.00),
('REL002', 'Reloj Analógico Elegante', 'MASCULINO', 12, 'UNICA', 'Luxury Time', 'Dorado', 4, 8, 150.00, 145.00, 140.00, 135.00),
('REL003', 'Reloj Fashion Femenino', 'FEMENINO', 12, 'UNICA', 'Chic Time', 'Plateado', 4, 12, 85.00, 80.00, 75.00, 70.00),

-- Accesorios - Carteras
('CAR001', 'Cartera Cuero Negro', 'FEMENINO', 13, 'UNICA', 'Leather Style', 'Negro', 4, 10, 95.00, 90.00, 85.00, 80.00),
('CAR002', 'Cartera Casual Marrón', 'FEMENINO', 13, 'UNICA', 'Urban Bags', 'Marrón', 4, 14, 75.00, 70.00, 65.00, 60.00),
('CAR003', 'Billetera Cuero Masculina', 'MASCULINO', 13, 'UNICA', 'Men Accessories', 'Negro', 4, 20, 35.00, 32.00, 30.00, 28.00),

-- Productos con stock bajo (para testing)
('TST001', 'Producto Stock Bajo', 'UNISEX', 1, 'UNICA', 'Test Brand', 'Azul', 1, 3, 25.00, 22.00, 20.00, 18.00),
('TST002', 'Producto Sin Stock', 'UNISEX', 1, 'UNICA', 'Test Brand', 'Rojo', 1, 0, 30.00, 27.00, 25.00, 22.00),
('TST003', 'Producto Stock Crítico', 'UNISEX', 1, 'UNICA', 'Test Brand', 'Verde', 1, 1, 35.00, 32.00, 30.00, 28.00);

-- Add some clients for testing
INSERT INTO clientes (nombre_cliente, tipo_cliente, numero_documento) VALUES
('Cliente General', 'NORMAL', '00000000'),
('Juan Pérez', 'NORMAL', '12345678'),
('María García', 'FRECUENTE', '87654321'),
('Carlos López', 'NORMAL', '11223344'),
('Ana Martínez', 'FRECUENTE', '44332211');

-- Add payment methods
INSERT INTO metodos_pago (nombre, descripcion) VALUES
('Efectivo', 'Pago en efectivo'),
('Tarjeta', 'Pago con tarjeta de crédito/débito'),
('Yape', 'Pago mediante Yape'),
('Plin', 'Pago mediante Plin'),
('Transferencia', 'Transferencia bancaria');
