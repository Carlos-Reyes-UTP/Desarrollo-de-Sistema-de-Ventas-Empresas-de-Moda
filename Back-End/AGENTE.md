# AGENTE.md — Backend DK-SYSTEM

> Documento de contexto estructural completo para agentes de IA.
> Última actualización: Abril 2026.

---

## 1. Identidad del Proyecto

| Campo | Valor |
|---|---|
| **Nombre** | DK-SYSTEM — API REST para Sistema de Ventas de Moda |
| **Lenguaje** | Java 21 |
| **Framework** | Spring Boot 3.4.6 |
| **Seguridad** | Spring Security 6 + JWT (com.auth0:java-jwt 4.4) |
| **ORM** | Spring Data JPA / Hibernate |
| **Base de Datos** | MySQL 8 (`tiendaropadk`) |
| **Migraciones** | Flyway (flyway-core + flyway-mysql) |
| **Validación** | Spring Validation (jakarta.validation) |
| **Documentación API** | Springdoc OpenAPI / Swagger UI 2.3 |
| **Reactive Client** | Spring WebFlux (para consumir APIs externas RENIEC/SUNAT) |
| **Código de Barras** | ZXing (core + javase) 3.5.2 |
| **Boilerplate** | Lombok (@Data, @Builder, @RequiredArgsConstructor) |
| **Puerto** | `http://localhost:8080` |

---

## 2. Arquitectura de Directorios (Estructura Real)

```
src/main/java/com/tienda/ropa/
├── RopaApplication.java              # Clase principal Spring Boot
│
├── config/                           # Configuración del sistema
│   ├── SecurityConfiguration.java    # Spring Security: CORS, filtros, autorización por roles
│   └── filter/
│       └── JwtAuthenticationFilter.java  # Filtro que valida JWT en cada request
│
├── util/                             # Utilidades
│   └── JwtUtils.java                 # Creación, validación y parsing de tokens JWT
│
├── agregates/                        # Objetos de transferencia para Auth
│   ├── request/
│   │   ├── SignInRequest.java        # Record: { usuario, clave }
│   │   └── SignUpRequest.java        # Record: { usuario, clave, rol, activo }
│   ├── response/
│   │   └── AuthenticationResponse.java  # Record: { usuario, mensaje, token, ok }
│   └── validation/                   # Validadores custom
│
├── dto/                              # Data Transfer Objects (negocio)
│   ├── ActualizarUsuarioDTO.java     # DTO para actualizar usuario existente
│   ├── CategoriaDTO.java            # DTO para árbol de categorías
│   ├── CodigoBarrasDTO.java         # DTO para generación de códigos
│   ├── MayoristaDTO.java            # DTO para operaciones mayoristas
│   ├── ProductoMasVendidoDTO.java   # DTO para ranking de productos
│   ├── ProductoVarianteDTO.java     # DTO para variantes (talla+color+stock)
│   ├── ReniecResponseDTO.java       # DTO de respuesta API RENIEC (personas)
│   ├── ReportePorCategoriaDTO.java  # DTO para reportes por categoría
│   ├── SunatResponseDTO.java        # DTO de respuesta API SUNAT (empresas)
│   ├── TallaProductoDTO.java        # DTO para tallas de producto
│   ├── UsuarioDTO.java              # DTO para respuesta de usuario (SIN contraseña)
│   └── VariantesPorColorDTO.java    # DTO para variantes agrupadas por color
│
├── entity/                           # Entidades JPA (tablas MySQL)
│   ├── Producto.java                 # Producto maestro (precios, volumen, validaciones)
│   ├── ProductoVariante.java         # Variante: producto + talla + color + stock
│   ├── Categoria.java               # Categoría jerárquica (padre/hijos)
│   ├── Talla.java                   # Catálogo de tallas
│   ├── Color.java                   # Catálogo de colores
│   ├── Venta.java                   # Cabecera de venta
│   ├── DetalleVenta.java            # Línea de detalle de venta
│   ├── Cliente.java                 # Cliente (DNI/RUC)
│   ├── Mayorista.java               # Cliente mayorista (código + descuentos)
│   ├── Proveedores.java             # Proveedor (RUC + nombre)
│   ├── Usuario.java                 # Usuario del sistema (implements UserDetails)
│   ├── Rol.java                     # Entidad rol (ManyToMany con Usuario)
│   └── Role.java                    # Enum: ADMIN, CAJERO, ALMACENERO
│
├── repository/                       # Interfaces JPA Repository
│   ├── ProductoRepository.java       # Búsquedas por nombre, código, categoría
│   ├── ProductoVarianteRepository.java  # Queries nativas para variantes de cajero
│   ├── CategoriaRepository.java     # Búsqueda por padre, nombre
│   ├── VentaRepository.java         # Consultas de ventas por fecha
│   ├── DetalleVentaRepository.java
│   ├── ClienteRepository.java
│   ├── MayoristaRepository.java     # Búsqueda por código, cliente
│   ├── ProveedoresRepository.java   # Búsqueda por nombre, RUC
│   ├── ColorRepository.java
│   ├── TallaRepository.java
│   ├── UsuarioRepository.java       # findByUsuario()
│   ├── RolRepository.java           # findByNombreRol()
│   └── ReporteRepository.java       # Queries nativas complejas para reportes
│
├── service/                          # Interfaces de servicio
│   ├── ProductoService.java          # Gestión de productos + categorías + precios
│   ├── ProductoVarianteService.java  # Interface para variantes
│   ├── CategoriaService.java        # Árbol jerárquico + prevención de ciclos
│   ├── VentaService.java            # Registro de ventas
│   ├── DetalleVentaService.java
│   ├── ClienteService.java          # Clientes + consulta RENIEC/SUNAT
│   ├── MayoristaService.java        # Gestión mayoristas (código auto-generado)
│   ├── ProveedoresService.java      # CRUD proveedores + consulta SUNAT
│   ├── ColorService.java            # Interface colores
│   ├── TallaService.java            # Interface tallas
│   ├── CodigoBarrasService.java     # Generación de códigos de barras (ZXing)
│   ├── ReporteService.java          # Lógica de reportes
│   ├── UsuarioService.java          # Interface de usuario
│   ├── AuthenticationService.java   # Interface de autenticación
│   ├── RolService.java              # Interface de roles
│   ├── ApiExternoService.java       # Consumo de APIs externas (RENIEC/SUNAT via WebClient)
│   └── impl/                        # Implementaciones concretas
│       ├── UsuarioServiceImpl.java       # ABM usuarios, validación de roles, último admin
│       ├── AuthenticationServiceImpl.java # Login (signin), registro (signUp)
│       ├── ProductoVarianteServiceImpl.java  # Migración stock, CRUD variantes
│       ├── CodigoBarrasServiceImpl.java  # Generación de imágenes de código de barras
│       ├── ColorServiceImpl.java
│       └── TallaServiceImpl.java
│
└── controller/                       # Endpoints REST
    ├── AuthenticationController.java     # POST /api/autenticacion/signin
    ├── UsuarioController.java            # CRUD /api/usuarios/**
    ├── ProductoController.java           # CRUD /api/productos/**
    ├── ProductoVarianteController.java   # CRUD /api/producto-variantes/**
    ├── CajeroProductoController.java     # GET /api/cajero/productos/** (solo lectura + stock)
    ├── CategoriaController.java          # CRUD /api/categorias/**
    ├── ArbolDeCategoriasController.java  # GET /api/arbol-categorias
    ├── VentaController.java              # POST /api/ventas/** (registro de ventas)
    ├── ClienteController.java            # CRUD /api/clientes/**
    ├── MayoristaController.java          # CRUD /api/mayoristas/**
    ├── ProveedoresController.java        # CRUD /api/proveedores/**
    ├── ColorController.java              # CRUD /api/colores/**
    ├── TallaController.java              # CRUD /api/tallas/**
    ├── CodigoBarrasController.java       # GET /api/codigo-barras/**
    └── ReporteController.java            # GET /api/reportes/**
```

---

## 3. Modelo de Datos (Entidades y Relaciones)

```
Usuario ──ManyToMany──> Rol (ADMIN | CAJERO | ALMACENERO)
    │
    └── Venta (usuario que registró)
          │
          └── DetalleVenta ──> ProductoVariante ──> Producto
                                     │                 │
                                     ├── Talla          ├── Categoria (jerárquica: padre/hijos)
                                     └── Color          └── Proveedores (ManyToOne)

Cliente ──OneToOne──> Mayorista (código auto-generado)
```

### Validaciones a nivel de Entity
- **`Producto.java`**: `@PrePersist` / `@PreUpdate` valida que precios por volumen sean coherentes (precio unitario > precio mayorista > precio docena).
- **`DetalleVenta.java`**: `getSubtotal()` calcula `precioUnitario × cantidad`. `setSubtotal()` usa `BigDecimal.divide()` con `RoundingMode.HALF_UP`.
- **`Venta.java`**: `@JsonIgnoreProperties` oculta password del usuario en la serialización.

---

## 4. Seguridad (Spring Security)

### Configuración Global (`SecurityConfiguration.java`)
```
Rutas Públicas (sin JWT):
  - /api/autenticacion/**
  - /swagger-ui/**, /v3/api-docs/**

Rutas Protegidas (requieren JWT):
  - /api/usuarios/**           → ROLE_ADMIN
  - /api/productos/**          → ROLE_ADMIN, ROLE_ALMACENERO
  - /api/cajero/**             → ROLE_CAJERO, ROLE_ADMIN
  - /api/ventas/**             → ROLE_CAJERO, ROLE_ADMIN
  - /api/reportes/**           → ROLE_ADMIN
  - /api/categorias/**         → ROLE_ADMIN, ROLE_ALMACENERO
  - Resto                      → authenticated()
```

### Flujo JWT
```
1. Cliente envía POST /api/autenticacion/signin { usuario, clave }
2. AuthenticationServiceImpl.authenticate() → valida contra BCrypt
3. JwtUtils.createToken() → genera JWT con claims: sub, authorities, exp (2h)
4. Cliente envía JWT en header: Authorization: Bearer <token>
5. JwtAuthenticationFilter intercepta cada request:
   a. Extrae y valida el token
   b. Inyecta Authentication en SecurityContext
   c. Si token inválido → responde 401 JSON
```

### CORS (Orígenes Permitidos)
Configurados en `SecurityConfiguration.corsConfigurationSource()`:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000`

---

## 5. Reglas de Negocio Críticas (No Modificar sin Revisión)

### A. Protección del Último Administrador
`UsuarioServiceImpl.validarCambioRoles()` y `esUltimoAdministrador()` impiden:
- Eliminar o deshabilitar al último usuario con `ROLE_ADMIN`.
- Cambiar el rol del último admin a otro rol.
- El controller retorna `HTTP 409 Conflict` si se intenta.

### B. Jerarquía de Categorías
`CategoriaService.moverCategoria()` implementa una **verificación de descendencia recursiva** para prevenir ciclos en el árbol de categorías (una categoría no puede ser movida dentro de sus propios hijos).

### C. Precios por Volumen
`Producto.validarPreciosPorVolumen()` (ejecutado via `@PrePersist`/`@PreUpdate`) asegura que:
- Precio unitario > Precio por media docena > Precio por docena.
- Si la validación falla, lanza `IllegalStateException` que previene el guardado.

### D. Código de Mayorista
`MayoristaService.generarCodigoMayorista()` genera un código único basado en las iniciales del nombre del cliente + secuencia numérica. El código se regenera automáticamente si cambia el nombre del cliente.

---

## 6. APIs Externas

| API | Servicio | Propósito |
|-----|----------|-----------|
| RENIEC | `ApiExternoService.consultarDni()` | Buscar persona natural por DNI |
| SUNAT | `ApiExternoService.consultarRuc()` | Buscar empresa por RUC |

Ambas usan **Spring WebFlux WebClient** para llamadas reactivas. Los errores de API externa son capturados con try-catch para no bloquear la operación principal.

---

## 7. Reglas para Agentes de IA

### HACER ✅
- Usar `@Transactional` en servicios que ejecuten múltiples escrituras en secuencia.
- Usar el `PasswordEncoder` inyectado (bean global). Nunca `new BCryptPasswordEncoder()`.
- Registrar errores con el logger del framework (`logger.error()`). Nunca `System.out.println()`.
- Crear DTOs para respuestas de API. Nunca exponer contraseñas hasheadas en DTOs.
- Usar `@JsonBackReference`/`@JsonManagedReference` en relaciones bidireccionales para evitar recursión infinita en Jackson.
- Para nuevos endpoints, registrar la autorización por rol en `SecurityConfiguration.java`.
- Para nuevas entidades, crear en orden: Entity → Repository → Service (interface) → ServiceImpl → Controller.

### NO HACER ❌
- No usar `@CrossOrigin(origins = "*")` en controllers individuales. CORS se gestiona globalmente en `SecurityConfiguration`.
- No dejar filtros DEBUG o `System.out.println` en el código.
- No modificar la lógica de "último administrador" en `UsuarioServiceImpl` sin aprobación explícita.
- No crear consultas SQL directas; usar métodos derivados de JPA o `@Query` en los repositories.
- No alterar la validación de precios por volumen en `Producto.java`.
- No exponer datos sensibles (contraseñas, tokens) en respuestas JSON.
- No crear instancias manuales de beans inyectables (`new BCryptPasswordEncoder()`, `new ObjectMapper()`).

---

## 8. Configuración de Entorno (`application.properties`)

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/tiendaropadk
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
security.jwt.key=<clave-secreta-HMAC256>
security.jwt.user.generator=appRopaGrupoBtfld5
```

> **Nota:** `ddl-auto=update` permite que Hibernate actualice el esquema automáticamente. En producción, considerar cambiar a `validate` y usar Flyway exclusivamente para migraciones.
