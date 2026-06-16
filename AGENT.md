# AGENT.md — DK-SYSTEM

> Documento de contexto estructural completo para agentes de IA.
> Proyecto: Sistema de Ventas para Empresas de Moda (Full Stack: React + Spring Boot).

---

## 1. Identidad del Proyecto

| Campo | Frontend | Backend |
|---|---|---|
| **Propósito** | SPA para ventas, inventario, reportes, dashboard | API REST para gestión de ventas de moda |
| **Lenguaje** | TypeScript (~5.8) | Java 21 |
| **Framework** | React 19 + Vite 6 | Spring Boot 3.4.6 |
| **Estilo** | Tailwind CSS 4 + CSS variables | Spring Data JPA / Hibernate |
| **Seguridad** | JWT en localStorage | Spring Security 6 + JWT (HMAC256) |
| **Base de Datos** | — | PostgreSQL 16 + Flyway |
| **Tiempo Real** | STOMP over SockJS | STOMP / WebSocket |
| **Testing** | Vitest 3 | JUnit 5 / Spring Boot Test |
| **Puerto** | `http://localhost:5173` (dev) | `http://localhost:8080` |

---

## 2. Estructura del Repositorio

```
/
├── front-end/sistemaReact-Main/     # React SPA
│   ├── src/
│   │   ├── App.tsx                   # Router principal + lazy routes
│   │   ├── main.tsx                  # Entry point (ReactDOM + providers)
│   │   ├── context/                  # React Context providers
│   │   │   ├── AuthContext.tsx        # JWT auth + session management
│   │   │   ├── AppThemeContext.tsx    # Dark/light theme
│   │   │   ├── WebSocketContext.tsx   # STOMP real-time connection
│   │   │   └── BandejaSolicitudContext.tsx  # Request tray state
│   │   ├── config/
│   │   │   ├── apiClient.ts          # Axios instance + interceptors
│   │   │   └── apiConfig.ts          # All API route constants
│   │   ├── types/                    # TypeScript DTOs
│   │   ├── services/                 # API service classes (per domain)
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── pages/                    # Page-level components (by role)
│   │   ├── components/              # Feature components (by domain)
│   │   ├── shared/
│   │   │   ├── ui/                   # Reusable UI (modals, cards, skeletons)
│   │   │   ├── layout/               # Layout, sidebar, navigation
│   │   │   ├── auth/                 # Auth loading screen
│   │   │   └── constants/            # Shared constants
│   │   ├── utils/                    # Utility functions
│   │   └── styles/                   # Extra CSS files
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── Back-End/                         # Spring Boot API
│   ├── src/main/java/com/tienda/ropa/
│   │   ├── RopaApplication.java
│   │   ├── config/                   # Security, WebSocket, CORS, etc.
│   │   ├── controller/               # 23 REST controllers
│   │   ├── service/                  # 29 service classes
│   │   ├── entity/                   # 26 JPA entities
│   │   ├── dto/                      # 40+ DTOs
│   │   ├── repository/              # 21 JPA repositories
│   │   ├── agregates/               # Auth request/response DTOs
│   │   └── util/                     # JWT utils, validators
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/            # Flyway migrations (V1-V6)
│   ├── src/test/
│   └── pom.xml
│
├── scripts/                          # Build/utility scripts
├── docs/                             # Project documentation
├── DESIGN.md
├── QA-LOGS.md
├── UI_AUDIT_REPORT.md
└── .agent/skills/                    # Agent skills (security-focused)
```

---

## 3. Roles del Sistema

| Rol | Constante | Acceso |
|---|---|---|
| Administrador | `ROLE_ADMIN` | Full access, user management, reports |
| Gerente | `ROLE_GERENTE` | Dashboard gerente, estructura almacén, reportes |
| Supervisor Almacén | `ROLE_SUPERVISOR_ALMACEN` | Almacén + inventario |
| Almacenero | `ROLE_ALMACENERO` | Productos, categorías, solicitudes, inventario |
| Vendedor | `ROLE_VENDEDOR` | Catálogo piso, solicitudes a almacén |
| Cajero | `ROLE_CAJERO` | Punto de venta, caja, clientes |

Definido en: `front-end/sistemaReact-Main/src/types/enums.ts` y `Back-End/src/main/java/com/tienda/ropa/entity/Role.java`

---

## 4. Frontend Architecture

### 4.1 Routing & Role Protection

`src/App.tsx` define rutas lazy-loaded. Cada ruta usa `RutaProtegidaConLayout` que:
1. Verifica autenticación vía `AuthContext`
2. Verifica rol requerido (o array de roles)
3. Renderiza `Layout` + `WebSocketProvider`
4. Muestra `PageFallback` (skeleton) durante lazy load

**APP_PATHS** (`src/shared/layout/navigationConfig.ts`):
```
/dashboard/admin          → ROLE_ADMIN
/dashboard/gerente        → ROLE_GERENTE
/dashboard/almacenero     → ROLE_ALMACENERO, ROLE_SUPERVISOR_ALMACEN
/ventas/punto-de-venta    → ROLE_CAJERO
/ventas/vendedor-solicitud-almacen → ROLE_VENDEDOR
/almacen/tablero-pedidos  → ROLE_ALMACENERO, ROLE_SUPERVISOR_ALMACEN
/admin/usuarios           → ROLE_ADMIN
/gerente/usuarios         → ROLE_GERENTE
/gerente/pisos            → ROLE_GERENTE
/inventario/productos     → ROLE_ALMACENERO, ROLE_SUPERVISOR_ALMACEN
/inventario/proveedores   → ROLE_ALMACENERO, ROLE_SUPERVISOR_ALMACEN
/inventario/categorias    → ROLE_ALMACENERO, ROLE_SUPERVISOR_ALMACEN
/admin/reportes           → ROLE_ADMIN, ROLE_GERENTE
```

### 4.2 Auth Flow

1. `AuthContext` hidrata sesión desde `localStorage` al montar
2. `iniciarSesion()` → POST `/api/autenticacion/signin` → decodifica JWT → extrae roles de `authorities` → almacena en state + localStorage
3. `apiClient.ts` interceptor añade `Authorization: Bearer <token>` a cada request
4. Interceptor de respuesta: 401 con mensaje de token inválido → limpia sesión → redirige a `/login`
5. Sesión expira automáticamente según `exp` del JWT (modal de aviso + redirección)

### 4.3 API Layer

- **Base URL**: `http://localhost:8080` (`src/config/apiConfig.ts`)
- **Client**: Axios con timeout 15s (`src/config/apiClient.ts`)
- **Interceptors**: Request (JWT header), Response (401 handling, network errors, 500s)
- **Services**: `src/services/` — clases por dominio (ProductoService, VentaService, etc.)

### 4.4 Context Providers

| Context | Archivo | Propósito |
|---|---|---|
| `AuthProvider` | `context/AuthContext.tsx` | Auth state, login/logout, role check, session expiry |
| `AppThemeProvider` | `context/AppThemeContext.tsx` | Dark/light theme via CSS variables |
| `WebSocketProvider` | `context/WebSocketContext.tsx` | STOMP connection lifecycle |
| `BandejaSolicitudProvider` | `context/BandejaSolicitudContext.tsx` | Vendedor request tray state |

### 4.5 UI / Design System

- **Framework**: Tailwind CSS 4 + Material Tailwind 2
- **Icons**: Material Symbols + Heroicons + Lucide React
- **Theming**: CSS variables via `AppThemeContext` (`--app-bg`, `--app-surface`, `--app-accent`, etc.)
- **Font**: Manrope (sans-serif)
- **Shared UI** (`src/shared/ui/`):
  - `AppModal`, `ConfirmModal`, `AlertModal` (via `ModalPortal`)
  - `Skeleton` variants: Table, CardGrid, Chart, MetricCards, ListItem, SearchResult, AppShell
  - `PageHeader`, `SectionHeader`, `PageHeaderMetaChip`
  - `Card`, `ComboBox`, `AppSelect`, `MaterialIcon`
  - `DashboardPanel`, `DashboardMetricCard`, `DashboardCtaPanel`
- **Charts**: Recharts + D3
- **Barcode**: `html5-qrcode` (scanner), `react-barcode` (render), ZXing (backend generation)
- **PWA**: Vite PWA plugin, auto-update, standalone display

### 4.6 Testing

- **Framework**: Vitest 3
- **Environment**: `node`
- **Location**: `src/**/*.test.ts` (co-located with source)
- **Existing tests**: validarPreciosProducto, validarIdentificacionCliente, aplicarMatrizVariantes, syncTriggers, almacenTableroUtils

### 4.7 Build & Dev Commands

```bash
cd front-end/sistemaReact-Main
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run test       # Vitest
npm run preview    # Vite preview (with API proxy)
```

---

## 5. Backend Architecture

### 5.1 Capas

```
Controller → Service (Interface) → ServiceImpl → Repository → Entity → DB
                            ↕
                        DTOs / Mappers
```

### 5.2 Security Configuration (`config/SecurityConfiguration.java`)

- **CSRF**: DISABLED
- **Session**: STATELESS
- **JWT Filter**: `JwtAuthenticationFilter` antes de `UsernamePasswordAuthenticationFilter`
- **CORS**: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`, `http://127.0.0.1:3000`, `http://localhost:1420`, `http://localhost:4173`
- **Password**: BCrypt via `DaoAuthenticationProvider`
- **Rutas públicas**: `/api/autenticacion/**`, `/ws/**`, `/api/v1/codigosbarras/**`
- **Error handling**: 403 JSON custom, `ApiExceptionHandler` global

### 5.3 JWT (`util/JwtUtils.java`)

| Propiedad | Valor |
|---|---|
| Algoritmo | HMAC256 |
| Expiración | 8 horas |
| Claims | `sub` (username), `authorities` (roles ordenados), `exp`, `iat` |
| Issuer | `appRopaGrupoBtfld5` |

### 5.4 Endpoints por Controlador

#### Auth
| Método | Ruta | Roles |
|---|---|---|
| POST | `/api/autenticacion/signin` | Público |

#### Admin
| Método | Ruta | Roles |
|---|---|---|
| CRUD | `/api/admin/user/**` | ADMIN |
| GET | `/api/admin/reportes/**` | ADMIN, GERENTE |
| CRUD | `/api/admin/mayoristas/**` | ADMIN |

#### Gerente
| Método | Ruta | Roles |
|---|---|---|
| CRUD | `/api/gerente/user/**` | GERENTE |
| CRUD | `/api/gerente/estructura-almacen/**` | GERENTE |

#### Almacenero
| Método | Ruta | Roles |
|---|---|---|
| CRUD | `/api/almacenero/productos/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| CRUD | `/api/almacenero/variantes/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| CRUD | `/api/almacenero/categorias/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| CRUD | `/api/almacenero/categorias-tree/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| CRUD | `/api/almacenero/proveedores/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| CRUD | `/api/almacenero/codigobarras/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| GET | `/api/almacenero/solicitudes/cola` | ALMACENERO, SUPERVISOR_ALMACEN |
| POST | `/api/almacenero/solicitudes/{id}/atender` | ALMACENERO, SUPERVISOR_ALMACEN |
| POST | `/api/almacenero/solicitudes/atender-lote` | ALMACENERO, SUPERVISOR_ALMACEN |
| POST | `/api/almacenero/solicitudes/{id}/rechazar` | ALMACENERO, SUPERVISOR_ALMACEN |
| GET | `/api/almacenero/ubicaciones/**` | ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR, GERENTE, CAJERO |
| GET | `/api/almacenero/dashboard/**` | ALMACENERO, SUPERVISOR_ALMACEN |
| GET/POST | `/api/almacenero/inventario/**` | ALMACENERO, SUPERVISOR_ALMACEN |

#### Cajero / POS
| Método | Ruta | Roles |
|---|---|---|
| GET | `/api/cajero/productos/**` | CAJERO, ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR |
| CRUD | `/api/cajero/clientes/**` | CAJERO, ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR |
| POST | `/api/cajero/ventas/**` | CAJERO, ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR |
| GET | `/api/cajero/ventas/**` | ADMIN, GERENTE, CAJERO, ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR |
| CRUD | `/api/caja/**` | CAJERO, ALMACENERO, SUPERVISOR_ALMACEN, VENDEDOR |

#### Vendedor
| Método | Ruta | Roles |
|---|---|---|
| GET | `/api/vendedor/catalogo**` | VENDEDOR |
| POST | `/api/vendedor/solicitudes**` | VENDEDOR |
| DELETE | `/api/vendedor/solicitudes/{id}` | VENDEDOR |
| GET | `/api/vendedor/solicitudes/mias` | VENDEDOR |
| GET | `/api/vendedor/ubicaciones` | VENDEDOR |

### 5.5 Entidades Principales

```
Usuario ──ManyToMany──> Rol (ADMIN | GERENTE | SUPERVISOR_ALMACEN | ALMACENERO | VENDEDOR | CAJERO)
  └── areaAsignado ──> UbicacionArea
  └── Venta (usuario que registró)

Producto ──ManyToOne──> Categoria (subcategoría)
  └── categoriaPadre ──> Categoria (categoría principal)
  └── proveedor ──> Proveedores
  └── ProductoVariante ──> Talla (String), Color (String), SKU
        └── Inventario ──> UbicacionArea (stock físico + stockMin/Max)

Venta ──> DetalleVenta ──> ProductoVariante
  └── Cliente
  └── metodoPago: EFECTIVO | TARJETA | YAPE | PLIN
  └── origenVenta: PISO | ALMACEN_DIRECTO

Solicitud (Venta/Reposición) ──> DetalleSolicitud ──> ProductoVariante
  └── estado: PENDIENTE | ATENDIDO | CANCELADO
  └── ubicacionAreaOrigen ──> UbicacionArea
  └── ubicacionAreaDestino ──> UbicacionArea

Ubicacion ──> UbicacionArea <── Area
  (piso/planta)     └── activo   (sector/zona)

Inventario: stock por (ubicacionArea, variante)
Caja: apertura/cierre por usuario, movimientos
MovimientoInventario: TRASLADO | VENTA | REPOSICION | AJUSTE
```

### 5.6 WebSocket / STOMP

- **Endpoint**: `/ws` con SockJS
- **Broker**: `/topic` (server → client)
- **Auth**: JWT en header `Authorization` del frame STOMP CONNECT
- **Eventos**: `NUEVA_VENTA`, `SOLICITUD_CREADA`, `SOLICITUD_ATENDIDA`, `SOLICITUD_RECHAZADA`
- **Frontend**: `WebSocketContext.tsx` maneja conexión, reconexión, subscripciones

### 5.7 Reglas de Negocio Críticas

1. **Último Admin**: No se puede eliminar/deshabilitar/cambiar rol del último ADMIN (`UsuarioServiceImpl`)
2. **Último Gerente**: Misma protección para el último GERENTE
3. **Jerarquía Categorías**: Prevención de ciclos al mover categorías
4. **Precios por Volumen**: Precio unitario > precio cuarto > precio media docena > precio docena
5. **Código Mayorista**: Auto-generado desde iniciales + secuencia, se regenera al cambiar nombre
6. **Reserva de Solicitudes**: TTL 90 min para solicitudes VENTA pendientes, scheduler expira cada 5 min
7. **Venta Directa**: Flag `venta.directa.habilitada=false` — por defecto no se descuenta stock directo de almacén

### 5.8 Build & Dev Commands

```bash
cd Back-End
./mvnw spring-boot:run     # Dev server
./mvnw clean test          # Tests
./mvnw clean package       # Build JAR
./mvnw flyway:migrate      # Run pending migrations
```

### 5.9 API Documentation (Swagger)

Disponible en `http://localhost:8080/swagger-ui/index.html` (Springdoc OpenAPI 2.3)

---

## 6. Base de Datos

| Propiedad | Valor |
|---|---|
| Motor | PostgreSQL 16 |
| Base | `tiendaropadk` |
| Migraciones | Flyway (`classpath:db/migration/`) |
| Migraciones activas | V1 (schema), V2 (datos), V3 (demo), V4 (area), V5 (venta), V6 (ubicación) |
| DDL | `none` (Flyway gestiona el esquema) |
| Pool | HikariCP (default) |

---

## 7. Convenciones de Código

### Frontend
- **Imports**: `@/` alias para `src/`
- **Componentes**: Arrow function components, archivos `.tsx`
- **Tipos**: Interfaces en `types/`, exportaciones con `type` cuando corresponda
- **Servicios**: Clases con métodos estáticos o instancia única, retornan `Promise<T>`
- **Hooks**: `useXxx` naming, hooks custom en `hooks/`
- **Contextos**: Provider pattern con `useXxx` hook de acceso
- **Testing**: `*.test.ts`, co-located, Vitest

### Backend
- **Orden creación**: Entity → Repository → Service (interface) → ServiceImpl → Controller
- **DTOs**: Nunca exponer contraseñas en respuestas
- **Transacciones**: `@Transactional` en servicios con múltiples escrituras
- **Logger**: `logger.error()` del framework, nunca `System.out`
- **Security**: `@PreAuthorize` o routes en SecurityConfiguration; nunca `@CrossOrigin("*")` individual
- **JPA**: Usar métodos derivados o `@Query`, no SQL directo
- **Lombok**: `@Data`, `@Builder`, `@RequiredArgsConstructor`
- **Jackson**: `@JsonBackReference`/`@JsonManagedReference` en relaciones bidireccionales

---

## 8. Testing

| Capa | Herramienta | Ubicación | Comando |
|---|---|---|---|
| Frontend | Vitest 3 | `src/**/*.test.ts` | `npm run test` (en front-end/) |
| Backend | JUnit 5 + Spring Boot Test | `src/test/java/**` | `./mvnw clean test` (en Back-End/) |

---

## 9. Servicios Externos

| API | Servicio Backend | Propósito |
|---|---|---|
| RENIEC | `ApiExternoService.consultarDni()` | Búsqueda de persona por DNI |
| SUNAT | `ApiExternoService.consultarRuc()` | Búsqueda de empresa por RUC |

Ambos usan Spring WebFlux `WebClient`. Errores capturados sin bloquear operación principal.

---

## 10. Archivos Clave de Referencia

| Archivo | Propósito |
|---|---|
| `front-end/.../src/App.tsx` | Router principal, lazy routes, role protection |
| `front-end/.../src/context/AuthContext.tsx` | Auth state, JWT management, session expiry |
| `front-end/.../src/config/apiClient.ts` | Axios instance, interceptors, token handling |
| `front-end/.../src/config/apiConfig.ts` | All API route constants |
| `front-end/.../src/shared/layout/navigationConfig.ts` | APP_PATHS, sidebar resolution |
| `front-end/.../src/shared/ui/index.ts` | Shared UI barrel export |
| `front-end/.../src/types/enums.ts` | Role constants |
| `front-end/.../src/hooks/useAuthReady.ts` | Auth initialization hook |
| `front-end/.../src/utils/authBootstrap.ts` | Session hydration from localStorage |
| `Back-End/.../config/SecurityConfiguration.java` | CORS, route security, JWT filter |
| `Back-End/.../config/WebSocketConfig.java` | STOMP/WebSocket setup |
| `Back-End/.../config/filter/JwtAuthenticationFilter.java` | JWT validation filter |
| `Back-End/.../util/JwtUtils.java` | JWT create/validate/parse |
| `Back-End/.../service/impl/UsuarioServiceImpl.java` | User CRUD + last admin protection |
| `Back-End/.../service/impl/SolicitudServiceImpl.java` | Request lifecycle (create, attend, reject) |
| `Back-End/.../service/InventarioService.java` | Inventory logic (stock, reservations, transfers) |
| `Back-End/.../service/AlertaReposicionService.java` | Restock alerts |
| `Back-End/.../service/ReposicionAutomaticaService.java` | Auto-restock logic |
| `Back-End/.../service/VentaService.java` | Sale registration with inventory deduction |
| `Back-End/.../service/DashboardService.java` | Dashboard statistics |
| `Back-End/src/main/resources/application.properties` | DB, JWT, Flyway, business rules config |

---

## 11. Reglas para Agentes de IA

### HACER ✅
- Frontend: Usar `@/` alias, componentes funcionales, lazy loading para rutas
- Frontend: Co-locar tests `*.test.ts` junto al source
- Backend: Crear en orden Entity → Repository → Service → Controller
- Backend: Usar `@Transactional` en operaciones multi-escritura
- Backend: DTOs para respuestas, nunca exponer hashes/contraseñas
- Backend: Roles en `SecurityConfiguration.java` para nuevos endpoints
- Mantener consistencia con el sistema de roles existente
- CSS variables para theming (no colores hardcodeados)
- Skeleton components para estados de carga

### NO HACER ❌
- No modificar lógica de "último administrador" en UsuarioServiceImpl
- No alterar validación de precios por volumen en Producto.java
- No usar `@CrossOrigin("*")` — CORS es global en SecurityConfiguration
- No dejar `System.out.println` o console.log de DEBUG en producción
- No exponer datos sensibles en respuestas JSON (passwords, tokens)
- No crear instancias manuales de beans (`new BCryptPasswordEncoder()`, etc.)
- No modificar la política de roles sin verificar todos los controladores afectados
