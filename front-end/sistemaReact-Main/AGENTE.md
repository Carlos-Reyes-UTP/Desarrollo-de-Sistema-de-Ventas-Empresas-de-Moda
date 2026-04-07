# AGENTE.md — Frontend DK-SYSTEM

> Documento de contexto estructural completo para agentes de IA.
> Última actualización: Abril 2026.

---

## 1. Identidad del Proyecto

| Campo | Valor |
|---|---|
| **Nombre** | DK-SYSTEM — Sistema de Ventas para Empresas de Moda |
| **Tipo** | SPA (Single Page Application) |
| **Bundler** | Vite 6.3 |
| **Lenguaje** | TypeScript 5.8 estricto |
| **Framework** | React 19.1 |
| **Estilos** | Tailwind CSS 4.1 (plugin Vite `@tailwindcss/vite`) |
| **Ruteo** | React Router DOM 7.6 |
| **HTTP Client** | Axios 1.9 con interceptores JWT |
| **Iconos** | Lucide React 0.511, Heroicons 2.2 |
| **Gráficos** | Recharts 3.1 |
| **Exportación** | xlsx 0.18 (reportes Excel) |
| **Códigos de Barras** | react-barcode, qrcode.react |
| **JWT** | jwt-decode 4.0 |
| **Puerto de desarrollo** | `http://localhost:5173` |
| **Backend** | API REST Spring Boot en `http://localhost:8080` |

---

## 2. Arquitectura de Directorios (Estructura Real)

```
src/
├── main.tsx                          # Punto de entrada React + BrowserRouter
├── App.tsx                           # Definición de rutas y guards por rol
├── App.css / index.css               # Estilos globales
├── mobile-navbar.css                 # Estilos móviles del navbar
│
├── config/                           # Configuración HTTP
│   ├── apiClient.ts                  # Instancia Axios con interceptores JWT (token auto-inject)
│   └── apiConfig.ts                  # Base URL y constantes de endpoints
│
├── context/                          # Estado global (React Context)
│   └── AuthContext.tsx               # Proveedor de autenticación (login, logout, roles, token)
│
├── hooks/                            # Custom Hooks reutilizables
│   ├── useAuthReady.ts               # Verificación de carga de autenticación
│   ├── useProductoService.ts         # Hook para operaciones CRUD de productos
│   └── useProductoVarianteService.ts # Hook para variantes de producto
│
├── interfaces/                       # Tipos TypeScript (contratos de datos)
│   ├── Categoria.ts                  # Interface Categoria
│   ├── CategoriaDTO.ts              
│   ├── Cliente.ts                    # Interface Cliente (DNI/RUC)
│   ├── CodigoBarras.ts               # Tipos para generación de códigos
│   ├── Color.ts                      # Interface Color
│   ├── DashboardStats.ts             # Estadísticas del dashboard
│   ├── DetalleVenta.ts               # Líneas de detalle por venta
│   ├── MayoristaDTO.ts               # DTO para operaciones mayoristas
│   ├── MetodoPago.ts                 # Enum/Interface método de pago
│   ├── Producto.ts                   # Interface Producto completa (precios volumen)
│   ├── ProductoVariante.ts           # Interface variante (talla + color + stock)
│   ├── Proveedor.ts                  # Interface Proveedor
│   ├── ReporteVentas.ts              # Tipos para reportes
│   ├── Talla.ts                      # Interface Talla
│   ├── Usuario.ts                    # Interface Usuario + roles
│   ├── Venta.ts                      # Interface Venta
│   └── enums.ts                      # Enums compartidos (RolNombre, etc.)
│
├── services/                         # Servicios de comunicación con la API REST
│   ├── CategoriaServices.ts          # CRUD categorías
│   ├── ClienteServices.ts            # CRUD clientes + consulta RENIEC/SUNAT
│   ├── CodigoBarrasService.ts        # Generación de códigos de barras
│   ├── ColorService.ts               # CRUD colores
│   ├── DashboardService.ts           # Estadísticas del panel admin
│   ├── MayoristaService.ts           # Gestión de mayoristas
│   ├── MetodoDePagoServices.ts       # Métodos de pago
│   ├── ProductoServices.ts           # CRUD productos
│   ├── ProductoVarianteService.ts    # CRUD variantes de producto
│   ├── ProveedorServices.ts          # CRUD proveedores
│   ├── ReporteService.ts             # Generación de reportes
│   ├── TallaService.ts               # CRUD tallas
│   ├── UsuarioServices.ts            # CRUD usuarios + gestión de roles
│   └── VentaServices.ts              # Registro de ventas
│
├── pages/                            # Vistas principales (rutas de primer nivel)
│   ├── Login.tsx                     # Página de inicio de sesión
│   ├── DashboardAdmin.tsx            # Panel principal del administrador
│   ├── DashboardAlmacenero.tsx       # Panel principal del almacenero
│   ├── CajeroSistemaVentas.tsx       # Vista del punto de venta (cajero)
│   ├── GestionUsuarios.tsx           # ABM de usuarios del sistema
│   ├── Reportes.tsx                  # Vista de reportes
│   └── PaginaNoEncontrada.tsx        # Página 404
│
└── components/                       # Componentes organizados por dominio
    ├── auth/                         # Autenticación
    │   ├── AuthLoadingScreen.tsx      # Pantalla de carga durante validación
    │   └── SessionValidatorButton.tsx # Botón de validación de sesión
    ├── layout/                       # Estructura visual
    │   ├── Layout.tsx                # Wrapper principal (sidebar + contenido)
    │   ├── SidebarMenu.tsx           # Menú lateral de navegación
    │   └── StandardPageWrapper.tsx   # Wrapper estándar para páginas
    ├── productos/                    # Módulo de inventario
    │   ├── GestionProductos.tsx      # ABM de productos
    │   ├── GestionColores.tsx        # ABM de colores
    │   ├── GestionTallas.tsx         # ABM de tallas
    │   ├── GestionVariantes.tsx      # Gestión de variantes (talla+color+stock)
    │   ├── FormularioProductoUnificado.tsx  # Formulario completo de producto
    │   └── formulario-producto-unificado/  # Subcomponentes del formulario
    ├── catalogo/                     # Catálogo unificado
    │   ├── GestionProductosUnificada.tsx  # Vista unificada de productos
    │   └── GestionCodigosBarras.tsx      # Generación de códigos de barras
    ├── categorias/                   # Gestión de categorías
    │   └── GestionCategorias.tsx
    ├── cajero/                       # Módulo punto de venta
    │   ├── AperturaCaja.tsx          # Apertura de caja diaria
    │   ├── VentasPanel.tsx           # Panel principal de ventas
    │   ├── CierreCaja.tsx            # Cierre y cuadre de caja
    │   └── ventas-panel/             # Subcomponentes del panel de ventas
    ├── proveedores/                  # Gestión de proveedores
    │   └── GestionProveedores.tsx
    ├── mayoristas/                   # Módulo mayorista
    │   └── ModalHacerMayorista.tsx   # Modal para crear/gestionar mayoristas
    ├── reportes/                     # Módulo de reportes
    │   ├── DashboardReportes.tsx     # Dashboard de reportes
    │   ├── ReporteDeVentas.tsx       # Reporte detallado de ventas
    │   ├── ReportePorCategoria.tsx   # Reporte por categoría
    │   ├── ProductosMasVendidos.tsx  # Ranking de productos
    │   ├── ResumenGeneral.tsx        # Resumen ejecutivo
    │   └── productos-mas-vendidos/   # Subcomponentes
    └── debug/                        # Herramientas de desarrollo
```

---

## 3. Sistema de Rutas y Guardianes de Acceso

El archivo `App.tsx` define las rutas protegidas usando el componente `RutaProtegidaConLayout` que verifica roles JWT.

| Ruta | Componente | Roles Permitidos |
|------|-----------|-----------------|
| `/login` | `Login` | Público |
| `/dashboard/admin` | `DashboardAdmin` | `ROLE_ADMIN` |
| `/dashboard/almacenero` | `DashboardAlmacenero` | `ROLE_ALMACENERO` |
| `/pages/CajeroSistemaVentas` | `CajeroSistemaVentas` | `ROLE_CAJERO`, `ROLE_ADMIN` |
| `/pages/GestionUsuarios` | `GestionUsuarios` | `ROLE_ADMIN` |
| `/pages/productos-unificado` | `GestionProductosUnificada` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/productos` | `GestionProductos` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/colores` | `GestionColores` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/tallas` | `GestionTallas` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/proveedores` | `GestionProveedores` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/categorias` | `GestionCategorias` | `ROLE_ADMIN`, `ROLE_ALMACENERO` |
| `/pages/reportes` | `Reportes` | `ROLE_ADMIN` |
| `*` | `PaginaNoEncontrada` | Público (404) |

La ruta raíz `/` redirige automáticamente al dashboard correspondiente según el rol del usuario autenticado.

---

## 4. Flujo de Autenticación

```
Login.tsx
  └─> POST /api/autenticacion/signin  (usuario, clave)
        └─> Backend retorna JWT token
              └─> AuthContext.tsx almacena token en localStorage
                    └─> apiClient.ts inyecta Bearer header automáticamente
                          └─> Interceptor verifica expiración del token
```

**Detalles clave:**
- Token JWT se almacena en `localStorage` bajo la clave `"token"`.
- `apiClient.ts` intercepta TODAS las peticiones y agrega el header `Authorization: Bearer <token>`.
- Timeout global de Axios: **15 segundos**.
- En errores de red para peticiones GET, el interceptor retorna `{ data: [] }` para evitar crashear la UI.
- El manejo de errores 401 ocurre exclusivamente en `AuthContext.tsx`.

---

## 5. Convenciones de Diseño (UI/UX)

### Paleta de Colores
| Uso | Valor |
|-----|-------|
| Fondo principal | `bg-[#fafafa]` |
| Fondo de cards | `bg-white/80` con `backdrop-blur-md` |
| Texto principal | `text-black` o `text-gray-900` |
| Texto secundario | `text-gray-600` |
| Bordes | `border-gray-200` |
| Hover en botones | `hover:bg-gray-100` |
| Botón primario | `bg-black text-white hover:bg-gray-800` |
| Botón peligro | `bg-red-500 text-white` (solo para eliminar) |

### Reglas Visuales Estrictas
1. **Sin alertas nativas.** Prohibido `window.alert()`, `window.confirm()`, y `window.prompt()`. Usar componentes modales customizados (`ConfirmModal`).
2. **Estética monocromática.** No inyectar colores vibrantes excepto para estados (Activo: verde, Inactivo: rojo).
3. **Bordes redondeados amplios:** `rounded-2xl` o `rounded-3xl`.
4. **Sombras sutiles:** `shadow-sm` para cards, `shadow-md` para modales.
5. **Transiciones suaves:** Todos los elementos interactivos llevan `transition-all`.
6. **Glassmorphism:** Cards con efecto vidrio: `bg-white/80 backdrop-blur-md`.

---

## 6. Reglas para Agentes de IA

### HACER ✅
- Tipar todo con interfaces de `src/interfaces/`. Cero uso de `any`.
- Crear componentes de máximo ~250 líneas. Si excede, dividir en subcomponentes.
- Usar `apiClient` (de `src/config/apiClient.ts`) para todas las llamadas HTTP. Nunca `fetch()` directo.
- Seguir el patrón existente: `services/` para lógica de API, `hooks/` para lógica reutilizable, `components/` para UI.
- Respetar la paleta monocromática documentada en la sección 5.
- Validar roles con `useAuth().tieneRol()` antes de renderizar contenido restringido.

### NO HACER ❌
- No usar `window.alert()`, `window.confirm()`, ni `window.prompt()`.
- No crear archivos CSS individuales por componente — usar Tailwind inline.
- No instalar dependencias sin mención explícita del usuario.
- No hardcodear URLs del backend — usar las constantes de `apiConfig.ts`.
- No modificar `AuthContext.tsx` sin revisión, es el corazón de la sesión.
- No crear páginas sin envolverlas en `RutaProtegidaConLayout` con el rol apropiado.
