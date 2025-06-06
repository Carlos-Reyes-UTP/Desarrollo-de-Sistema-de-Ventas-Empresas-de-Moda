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
  ARBOL: `${API_BASE_URL}/api/admin/categorias-tree`, // Para ArbolDeCategoriasController
  CREAR_EN_ARBOL: `${API_BASE_URL}/api/admin/categorias-tree`, // POST a /api/categorias-tree
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

