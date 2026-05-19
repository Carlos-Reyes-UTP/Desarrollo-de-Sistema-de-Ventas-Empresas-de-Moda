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
};

// Rutas de Productos
export const RUTAS_PRODUCTOS = {
  // Almacenero endpoints (full CRUD)
  BASE: `${API_BASE_URL}/api/almacenero/productos`,
  PAGINADOS: `${API_BASE_URL}/api/almacenero/productos/pagina`,
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
    // Nuevas rutas para variantes
    VARIANTES: `${API_BASE_URL}/api/cajero/productos/variantes`,
    VARIANTE_POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/productos/variantes/${id}`,
    VARIANTES_POR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/cajero/productos/variantes/producto/${idProducto}`,
    DISMINUIR_VARIANTE: (id: number) => `${API_BASE_URL}/api/cajero/productos/variantes/${id}/disminuir`,
    DISMINUIR_PRODUCTO: (id: number) => `${API_BASE_URL}/api/cajero/productos/${id}/disminuir`,
    // Paginación server-side
    VARIANTES_PAGINADAS: `${API_BASE_URL}/api/cajero/productos/variantes/pagina`,
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
  USUARIO_ACTUAL: `${API_BASE_URL}/api/cajero/ventas/usuario-actual`,
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
  VERIFICAR_MAYORISTA: (numeroDocumento: string) => `${API_BASE_URL}/api/cajero/clientes/documento/${encodeURIComponent(numeroDocumento)}/es-mayorista`,
};

// Rutas de Métodos de Pago (TODO: Implementar controlador en backend)
export const RUTAS_METODOS_PAGO = {
  // BASE: `${API_BASE_URL}/api/cajero/metodos-pago`,
  // POR_ID: (id: number) => `${API_BASE_URL}/api/cajero/metodos-pago/${id}`,
};

// Rutas de Métodos de Pago (TODO: Implementar controlador en backend)
export const RUTAS_VARIANTES = {
  BASE: `${API_BASE_URL}/api/almacenero/variantes`,
  /** GET: listado completo (alineado con ProductoVarianteController /todas) */
  TODAS: `${API_BASE_URL}/api/almacenero/variantes/todas`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/almacenero/variantes/${id}`,
  POR_PRODUCTO: (idProducto: number) => `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}`,
  /** Filtro por nombre de talla (texto en variante), query `nombre` */
  POR_PRODUCTO_Y_TALLA: (idProducto: number, nombreTalla: string) =>
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/talla?nombre=${encodeURIComponent(nombreTalla)}`,
  /** Filtro por nombre de color, query `nombre` */
  POR_PRODUCTO_Y_COLOR: (idProducto: number, nombreColor: string) =>
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/color?nombre=${encodeURIComponent(nombreColor)}`,
  /** Combinación talla+color por texto */
  POR_PRODUCTO_TALLA_COLOR: (idProducto: number, talla: string, color: string) =>
    `${API_BASE_URL}/api/almacenero/variantes/producto/${idProducto}/combinacion?talla=${encodeURIComponent(talla)}&color=${encodeURIComponent(color)}`,
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

// Rutas de Mayoristas
export const RUTAS_MAYORISTAS = {
  BASE: `${API_BASE_URL}/api/admin/mayoristas`,
  POR_ID: (id: number) => `${API_BASE_URL}/api/admin/mayoristas/${id}`,
  POR_CODIGO: (codigo: string) => `${API_BASE_URL}/api/admin/mayoristas/codigo/${encodeURIComponent(codigo)}`,
  POR_DOCUMENTO: (numeroDocumento: string) => `${API_BASE_URL}/api/admin/mayoristas/documento/${encodeURIComponent(numeroDocumento)}`,
  CREAR_DE_CLIENTE: (idCliente: number) => `${API_BASE_URL}/api/admin/mayoristas/cliente/${idCliente}`,
};

// Rutas de Almacén (pisos / áreas / traslados)
/** Vendedor de piso: búsqueda por código, solicitudes a almacén (solo rol VENDEDOR) */
export const RUTAS_VENDEDOR = {
  CATALOGO_POR_CODIGO: (codigo: string) =>
    `${API_BASE_URL}/api/vendedor/catalogo-por-codigo/${encodeURIComponent(codigo)}`,
  CATALOGO_QUERY: (termino: string) =>
    `${API_BASE_URL}/api/vendedor/catalogo?termino=${encodeURIComponent(termino)}`,
  CATALOGO_POR_PRODUCTO: (idProducto: number) =>
    `${API_BASE_URL}/api/vendedor/catalogo-por-producto/${idProducto}`,
  CATALOGO_POR_VARIANTE: (idVariante: number) =>
    `${API_BASE_URL}/api/vendedor/catalogo-por-variante/${idVariante}`,
  SOLICITUDES: `${API_BASE_URL}/api/vendedor/solicitudes`,
  SOLICITUDES_LOTE: `${API_BASE_URL}/api/vendedor/solicitudes/lote`,
  MIS_SOLICITUDES: `${API_BASE_URL}/api/vendedor/solicitudes/mias`,
  CANCELAR_SOLICITUD: (idSolicitud: number) =>
    `${API_BASE_URL}/api/vendedor/solicitudes/${idSolicitud}`,
  /** Lista de pisos/áreas disponibles como destino de solicitud */
  UBICACIONES: `${API_BASE_URL}/api/vendedor/ubicaciones`,
};

/** Tablero almacén: cola de solicitudes pendientes */
export const RUTAS_ALMACENERO_SOLICITUDES = {
  COLA: `${API_BASE_URL}/api/almacenero/solicitudes/cola`,
  ATENDER: (id: number) => `${API_BASE_URL}/api/almacenero/solicitudes/${id}/atender`,
  ATENDER_LOTE: `${API_BASE_URL}/api/almacenero/solicitudes/atender-lote`,
  RECHAZAR: (id: number) => `${API_BASE_URL}/api/almacenero/solicitudes/${id}/rechazar`,
};

export const RUTAS_ALMACEN = {
  PISOS: `${API_BASE_URL}/api/almacenero/ubicaciones/pisos`,
  AREAS_POR_PISO: (nombrePiso: string) =>
    `${API_BASE_URL}/api/almacenero/ubicaciones/pisos/${encodeURIComponent(nombrePiso)}/areas`,
  RESUMEN_STOCK_PISO: (nombrePiso: string) =>
    `${API_BASE_URL}/api/almacenero/ubicaciones/pisos/${encodeURIComponent(nombrePiso)}/resumen-stock`,
  ORIGENES_POSIBLES: (idDestino: number) =>
    `${API_BASE_URL}/api/almacenero/ubicaciones/origenes?destino=${idDestino}`,
  STOCK_POR_UBICACION_AREA: (idUbicacionArea: number) =>
    `${API_BASE_URL}/api/almacenero/ubicaciones/${idUbicacionArea}/stock`,
  STOCK_DESDE_ALMACEN: `${API_BASE_URL}/api/almacenero/ubicaciones/stock/almacen`,
  STOCK_ALMACEN_BUSCAR: (q: string, limit: number, soloAlmacen = false, sector?: string) => {
    const params = new URLSearchParams();
    params.set("q", q);
    params.set("limit", String(limit));
    if (soloAlmacen) params.set("soloAlmacen", "true");
    if (sector?.trim()) params.set("sector", sector.trim());
    return `${API_BASE_URL}/api/almacenero/ubicaciones/stock/almacen/buscar?${params.toString()}`;
  },
  TRASLADO: `${API_BASE_URL}/api/almacenero/inventario/traslado`,
};

export const RUTAS_INVENTARIO_CONTEXTO = {
  MI_CONTEXTO: `${API_BASE_URL}/api/almacenero/inventario/mi-contexto`,
  AREAS_ALMACEN: `${API_BASE_URL}/api/almacenero/ubicaciones/areas-almacen`,
  RESUMEN_AREAS: `${API_BASE_URL}/api/almacenero/inventario/resumen-areas`,
};

export const RUTAS_DASHBOARD = {
  ESTADISTICAS: `${API_BASE_URL}/api/almacenero/dashboard/estadisticas`,
  DISTRIBUCION_CATEGORIAS: `${API_BASE_URL}/api/almacenero/dashboard/distribucion-categorias`,
  ESTADO_INVENTARIO: `${API_BASE_URL}/api/almacenero/dashboard/estado-inventario`,
};

// Rutas de Reportes
export const RUTAS_REPORTES = {
  BASE: `${API_BASE_URL}/api/admin/reportes`,
  PRODUCTOS_MAS_VENDIDOS: `${API_BASE_URL}/api/admin/reportes/productos-mas-vendidos`,
  POR_CATEGORIA: `${API_BASE_URL}/api/admin/reportes/por-categoria`,
  RESUMEN_GENERAL: `${API_BASE_URL}/api/admin/reportes/resumen-completo`,
  VENTAS_POR_PERIODO: `${API_BASE_URL}/api/admin/reportes/ventas-por-periodo`,
  PRODUCTOS_DETALLE: `${API_BASE_URL}/api/admin/reportes/productos-detalle`,
};

