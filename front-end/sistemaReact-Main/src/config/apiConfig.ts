export const API_BASE_URL = 'http://localhost:8080'; // Use full URL to bypass CORS via backend configuration

// Rutas de Autenticación
export const RUTAS_AUTENTICACION = {
  INICIAR_SESION: `${API_BASE_URL}/api/autenticacion/signin`,
  REGISTRAR_ADMIN: `${API_BASE_URL}/api/autenticacion/signup/createAdmin`,
};

// Rutas de Usuarios
export const RUTAS_USUARIOS = {
  BASE: `${API_BASE_URL}/api/admin/user`,
  CREAR: `${API_BASE_URL}/api/admin/user/createUser`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/admin/user/${id}`, // Para actualizar
  DESHABILITAR: (id: number) => `${API_BASE_URL}/api/admin/user/deshabilitar/${id}`,
  HABILITAR: (id: number) => `${API_BASE_URL}/api/admin/user/habilitar/${id}`,
  VERIFICAR_CONTRASENA: `${API_BASE_URL}/api/autenticacion/verify-password`, // Endpoint para verificar contraseña
};

// Rutas de Productos
export const RUTAS_PRODUCTOS = {
  // Almacenero endpoints (full CRUD)
  BASE: `${API_BASE_URL}/api/almacenero/productos`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/productos/${id}`,
  POR_CATEGORIA: (categoria: string) => `${API_BASE_URL}/api/almacenero/productos/categoria/${encodeURIComponent(categoria)}`,
  POR_CODIGO: (codigo: string) => `${API_BASE_URL}/api/almacenero/productos/codigo/${encodeURIComponent(codigo)}`,
  POR_NOMBRE: (nombre: string) => `${API_BASE_URL}/api/almacenero/productos/nombre/${encodeURIComponent(nombre)}`,
  POR_PROVEEDOR: (proveedor: string) => `${API_BASE_URL}/api/almacenero/productos/distribuidor/${encodeURIComponent(proveedor)}`, // El backend usa 'distribuidor'
  
  // Cajero endpoints (read-only for sales)
  CAJERO: {
    BASE: `${API_BASE_URL}/api/cajero/productos`,
    POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/productos/${id}`,
    POR_CODIGO: (codigo: string) => `${API_BASE_URL}/api/cajero/productos/codigo/${encodeURIComponent(codigo)}`,
    POR_NOMBRE: (nombre: string) => `${API_BASE_URL}/api/cajero/productos/nombre/${encodeURIComponent(nombre)}`,
    BUSCAR: (termino: string) => `${API_BASE_URL}/api/cajero/productos/buscar?termino=${encodeURIComponent(termino)}`,
  }
};

// Rutas de Categorías
export const RUTAS_CATEGORIAS = {
  BASE: `${API_BASE_URL}/api/almacenero/categorias`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/categorias/${id}`,
  PRINCIPALES: `${API_BASE_URL}/api/almacenero/categorias/principales`,
  SUBCATEGORIAS: (idPadre: number) => `${API_BASE_URL}/api/almacenero/categorias/${idPadre}/subcategorias`,
  ARBOL: `${API_BASE_URL}/api/almacenero/categorias-tree`, // Para ArbolDeCategoriasController
  CREAR_EN_ARBOL: `${API_BASE_URL}/api/almacenero/categorias-tree`, // POST a /api/categorias-tree
  BUSCAR: (nombre: string) => `${API_BASE_URL}/api/almacenero/categorias/buscar?nombre=${encodeURIComponent(nombre)}`,
  CREAR_SUBCATEGORIA: (idPadre: number) => `${API_BASE_URL}/api/almacenero/categorias/${idPadre}/subcategorias`, // POST
  MOVER: (id: number) => `${API_BASE_URL}/api/almacenero/categorias/${id}/mover`, // PATCH
};

// Rutas de Ventas
export const RUTAS_VENTAS = {
  BASE: `${API_BASE_URL}/api/cajero/ventas`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/ventas/${id}`,
  DETALLES: (id: number) => `${API_BASE_URL}/api/cajero/ventas/${id}/detalles`,
  POR_FECHA: (fecha: string) => `${API_BASE_URL}/api/cajero/ventas/fecha/${fecha}`,
  POR_CLIENTE: (idCliente: number) => `${API_BASE_URL}/api/cajero/ventas/cliente/${idCliente}`,
};

// Rutas de Proveedores
export const RUTAS_PROVEEDORES = {
  BASE: `${API_BASE_URL}/api/almacenero/proveedores`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/proveedores/${id}`,
  POR_NOMBRE: (nombre: string) => `${API_BASE_URL}/api/almacenero/proveedores/nombre/${encodeURIComponent(nombre)}`,
};

// Rutas de Clientes
export const RUTAS_CLIENTES = {
  BASE: `${API_BASE_URL}/api/cajero/clientes`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/clientes/${id}`,
  POR_DOCUMENTO: (numeroDocumento: string) => `${API_BASE_URL}/api/cajero/clientes/documento/${encodeURIComponent(numeroDocumento)}`,
};

// Rutas de Métodos de Pago
export const RUTAS_METODOS_PAGO = {
  BASE: `${API_BASE_URL}/api/cajero/metodos-pago`, // Updated to follow role-based pattern
  POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/metodos-pago/${id}`,
};

// Rutas de Colores
export const RUTAS_COLORES = {
  BASE: `${API_BASE_URL}/api/almacenero/colores`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/colores/${id}`,
  BUSCAR: (nombre: string) => `${API_BASE_URL}/api/almacenero/colores/buscar?nombre=${encodeURIComponent(nombre)}`,
};

// Rutas de Tallas
export const RUTAS_TALLAS = {
  BASE: `${API_BASE_URL}/api/almacenero/tallas`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/tallas/${id}`,
  BUSCAR: (nombre: string) => `${API_BASE_URL}/api/almacenero/tallas/buscar?nombre=${encodeURIComponent(nombre)}`,
  ORDENADAS: `${API_BASE_URL}/api/almacenero/tallas/ordenadas`,
};

// Rutas de Variantes de Productos
export const RUTAS_VARIANTES = {
  BASE: `${API_BASE_URL}/api/almacenero/variantes`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/variantes/${id}`,
  POR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}`,
  POR_PRODUCTO_Y_TALLA: (idProducto: number, idTalla: number) => 
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/talla/${idTalla}`,
  POR_PRODUCTO_Y_COLOR: (idProducto: number, idColor: number) => 
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/color/${idColor}`,
  POR_PRODUCTO_TALLA_COLOR: (idProducto: number, idTalla: number, idColor: number) => 
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/talla/${idTalla}/color/${idColor}`,
  ACTUALIZAR_CANTIDAD: (id: number) => `${API_BASE_URL}/api/almacenero/variantes/${id}/cantidad`,
  CANTIDAD_TOTAL_PRODUCTO: (idProducto: number) => 
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/cantidad-total`,
  MIGRAR_PRODUCTO: (idProducto: number) => 
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/migrar`,
};

// Rutas de Códigos de Barras
export const RUTAS_CODIGOS_BARRAS = {
  // Base routes for CRUD operations
  BASE: `${API_BASE_URL}/api/codigos-barras`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/codigos-barras/${id}`,
  
  // Search by barcode
  BUSCAR: (codigo: string) => `${API_BASE_URL}/api/codigos-barras/buscar/${encodeURIComponent(codigo)}`,
  
  // Generate new barcode
  GENERAR: `${API_BASE_URL}/api/codigos-barras/generar`,
  
  // Assign barcode to product or variant
  ASIGNAR: `${API_BASE_URL}/api/codigos-barras/asignar`,
  
  // Get barcodes by product
  POR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/codigos-barras/producto/${idProducto}`,
  
  // Get barcodes by variant
  POR_VARIANTE: (idVariante: number) => `${API_BASE_URL}/api/codigos-barras/variante/${idVariante}`,
  
  // Validation endpoint
  VALIDAR: (codigo: string) => `${API_BASE_URL}/api/codigos-barras/validar/${encodeURIComponent(codigo)}`,
  
  // Search products/variants by barcode (for scanning)
  BUSCAR_PRODUCTO: (codigo: string) => `${API_BASE_URL}/api/codigos-barras/buscar/producto/${encodeURIComponent(codigo)}`,
  BUSCAR_VARIANTE: (codigo: string) => `${API_BASE_URL}/api/codigos-barras/buscar/variante/${encodeURIComponent(codigo)}`,
};

