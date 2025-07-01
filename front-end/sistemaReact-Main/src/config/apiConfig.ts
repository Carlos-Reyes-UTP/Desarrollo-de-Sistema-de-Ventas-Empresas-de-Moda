export const API_BASE_URL = 'http://localhost:8080'; // Use full URL to bypass CORS via backend configuration

// Rutas de Autenticación
export const RUTAS_AUTENTICACION = {
  INICIAR_SESION: `${API_BASE_URL}/api/autenticacion/signin`,
  REGISTRAR_ADMIN: `${API_BASE_URL}/api/admin/user/createUser`, // Corregida para coincidir con UsuarioController
};

// Rutas de Usuarios
export const RUTAS_USUARIOS = {
  BASE: `${API_BASE_URL}/api/admin/user`,
  CREAR: `${API_BASE_URL}/api/admin/user/createUser`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/admin/user/${id}`, // Para actualizar
  DESHABILITAR: (id: number) => `${API_BASE_URL}/api/admin/user/deshabilitar/${id}`,
  HABILITAR: (id: number) => `${API_BASE_URL}/api/admin/user/habilitar/${id}`,
  // VERIFICAR_CONTRASENA: `${API_BASE_URL}/api/autenticacion/verify-password`, // TODO: Implementar en backend
};

// Rutas de Productos
export const RUTAS_PRODUCTOS = {
  // Almacenero endpoints (full CRUD)
  BASE: `${API_BASE_URL}/api/almacenero/productos`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/productos/${id}`,
  POR_CATEGORIA: (categoria: string) => `${API_BASE_URL}/api/almacenero/productos/categoria/${encodeURIComponent(categoria)}`,
  POR_CATEGORIA_PRINCIPAL: (categoriaPrincipal: string) => `${API_BASE_URL}/api/almacenero/productos/categoria-principal/${encodeURIComponent(categoriaPrincipal)}`,
  POR_SUBCATEGORIA: (subCategoria: string) => `${API_BASE_URL}/api/almacenero/productos/subcategoria/${encodeURIComponent(subCategoria)}`,
  FILTRAR_CATEGORIAS: (categoriaPrincipal?: string, subCategoria?: string) => {
    const params = new URLSearchParams();
    if (categoriaPrincipal) params.append('categoriaPrincipal', categoriaPrincipal);
    if (subCategoria) params.append('subCategoria', subCategoria);
    return `${API_BASE_URL}/api/almacenero/productos/filtrar-categorias?${params.toString()}`;
  },
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
  POR_RUC: (ruc: string) => `${API_BASE_URL}/api/almacenero/proveedores/buscar/${encodeURIComponent(ruc)}`,
};

// Rutas de Clientes
export const RUTAS_CLIENTES = {
  BASE: `${API_BASE_URL}/api/cajero/clientes`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/clientes/${id}`,
  POR_DOCUMENTO: (numeroDocumento: string) => `${API_BASE_URL}/api/cajero/clientes/documento/${encodeURIComponent(numeroDocumento)}`,
  POR_DNI: (numero: string) => `${API_BASE_URL}/api/cajero/clientes/documento/dni/${encodeURIComponent(numero)}`,
  POR_RUC: (numero: string) => `${API_BASE_URL}/api/cajero/clientes/documento/ruc/${encodeURIComponent(numero)}`,
};

// Rutas de Métodos de Pago (TODO: Implementar controlador en backend)
export const RUTAS_METODOS_PAGO = {
  // BASE: `${API_BASE_URL}/api/cajero/metodos-pago`,
  // POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/metodos-pago/${id}`,
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
  // Base routes for CRUD operations (Legacy controller)
  BASE: `${API_BASE_URL}/api/almacenero/codigobarras`,
  
  // Generate barcode for product
  GENERAR_PRODUCTO: (idProducto: number, ancho?: number, alto?: number) => {
    let url = `${API_BASE_URL}/api/almacenero/codigobarras/generar/${idProducto}`;
    const params = new URLSearchParams();
    if (ancho) params.append('ancho', ancho.toString());
    if (alto) params.append('alto', alto.toString());
    return params.toString() ? `${url}?${params.toString()}` : url;
  },
  
  // Generate barcode for variant
  GENERAR_VARIANTE: (idVariante: number, ancho?: number, alto?: number) => {
    let url = `${API_BASE_URL}/api/almacenero/codigobarras/generar-variante/${idVariante}`;
    const params = new URLSearchParams();
    if (ancho) params.append('ancho', ancho.toString());
    if (alto) params.append('alto', alto.toString());
    return params.toString() ? `${url}?${params.toString()}` : url;
  },
  
  // Assign barcode to product
  ASIGNAR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/almacenero/codigobarras/asignar/${idProducto}`,
  
  // Assign barcode to variant
  ASIGNAR_VARIANTE: (idVariante: number) => `${API_BASE_URL}/api/almacenero/codigobarras/asignar-variante/${idVariante}`,
  
  // Read barcode from image
  LEER: `${API_BASE_URL}/api/almacenero/codigobarras/leer`,
  
  // Search product by barcode
  BUSCAR_PRODUCTO: (codigo: string) => `${API_BASE_URL}/api/almacenero/codigobarras/buscar-producto/${encodeURIComponent(codigo)}`,
  
  // Search variant by barcode
  BUSCAR_VARIANTE: (codigo: string) => `${API_BASE_URL}/api/almacenero/codigobarras/buscar-variante/${encodeURIComponent(codigo)}`,
  
  // Validate barcode
  VALIDAR: (codigo: string) => `${API_BASE_URL}/api/almacenero/codigobarras/validar?codigo=${encodeURIComponent(codigo)}`,
  
  // Obtener todos los códigos de barras con detalles (optimizado para evitar N+1)
  OBTENER_TODOS_CON_DETALLES: `${API_BASE_URL}/api/almacenero/codigobarras/all-with-details`,
  
  // Obtener códigos de barras de un producto específico
  OBTENER_CODIGOS_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/almacenero/codigobarras/producto/${idProducto}`,
  
  // Obtener códigos de barras de una variante específica
  OBTENER_CODIGOS_VARIANTE: (idVariante: number) => `${API_BASE_URL}/api/almacenero/codigobarras/variante/${idVariante}`,
};

// Rutas de Códigos de Barras V1 (New robust controller)
export const RUTAS_CODIGOS_BARRAS_V1 = {
  // Base for V1 API
  BASE: `${API_BASE_URL}/api/v1/codigos-barras`,
  
  // Generate barcode image for product (returns PNG directly)
  GENERAR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/v1/codigos-barras/generar/producto/${idProducto}`,
  
  // Generate barcode image for variant (returns PNG directly)
  GENERAR_VARIANTE: (idVariante: number) => `${API_BASE_URL}/api/v1/codigos-barras/generar/variante/${idVariante}`,
};

