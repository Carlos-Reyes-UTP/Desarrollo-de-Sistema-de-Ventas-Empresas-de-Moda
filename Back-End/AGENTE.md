# Contexto del Proyecto Backend - DK-SYSTEM

Este documento sirve como referencia central y de memoria contextualizada para cualquier Agente de IA que trabaje o deba modificar código dentro de la capa Backend desarrollada en Spring Boot.

## 🛠️ Stack Tecnológico Core
- **Lenguaje Base:** Java 21.
- **Framework Principal:** Spring Boot 3.4.6.
- **Seguridad:** Spring Security con persistencia STATELESS (Filtros Personalizados).
- **Autenticación:** JSON Web Tokens (JWT) a través del motor `com.auth0:java-jwt`.
- **Capa de Persistencia:** Spring Data JPA / Hibernate (ORM).
- **Base de Datos:** MySQL Connector (`com.mysql.cj.jdbc.Driver`).
- **Librerías Extra:** Lombok (Boilerplate reducers), Spring Validation, Jackson (JSON Bindings).

## 🏗️ Estructura Arquitectónica (Capas y Responsabilidades)

El proyecto se estructura bajo un patrón estricto de Arquitectura en Capas:

```text
Back-End/src/main/java/com/tienda/ropa/
├── config/              # Clases de configuración (SecurityConfiguration, CorsConfiguration)
│   └── filter/          # Filtros de Middleware interceptores (JwtAuthenticationFilter)
├── controller/          # Endpoints REST (@RestController). Nunca manejar lógica de negocio aquí.
├── entity/              # Modelos mapeados a tablas MySQL (@Entity). Uso extensivo de Lombok (@Data).
├── repository/          # Interfaces extendiendo JpaRepository. Consultas a BD.
├── service/             # Lógica de Negocio Pura (Interfaces).
│   └── impl/            # Implementación concreta de Servicios de negocio.
└── agregates/           # Elementos DTO de recolección de datos
    ├── request/         # Records/DTOs de Payload de entrada (SignUpRequest, SignInRequest)
    └── response/        # Estructuras de respuesta para parseo JSON (AuthenticationResponse)
```

## 🔒 Convenciones y Reglas del Sistema

### 1. Seguridad (Spring Security)
*   Todas las rutas en ruta `/api/autenticacion/**` son públicas. Las demás se restringen vía `SecurityContext`.
*   El sistema posee tres roles rígidos en la DB mapeados en el Enum `Role`: `ADMIN`, `CAJERO`, `ALMACENERO`.
*   **Regla de Oro:** Siempre usar `PasswordEncoder` (BCryptPasswordEncoder inyectado) para salvar contraseñas.
*   **Regla de Negocio Intocable:** La lógica ubicada en `UsuarioServiceImpl` se asegura de que NUNCA se elimine o desactive al "último administrador" del sistema.

### 2. Gestión del Catálogo (Complejidad de Negocio)
*   **Gestión Jerárquica de Categorías:** `CategoriaService` controla que no se formen dependencias cíclicas si una categoría es movida a otra familia.
*   **Gestión de Precios (Volumen):** Las entidades `Producto` utilizan `@PrePersist` y `@PreUpdate` en el ORM para auto-validar la coherencia de los precios que dependen de la cantidad de compras al por mayor y menor.
*   **Variantes:** El módulo `ProductoVarianteService` encadena Productos "Maestros" con sus versiones hijas (talla y color). Modificar el stock global se empuja indirectamente al disminuir el sub-stock de las Variantes.

### 3. Buenas Prácticas de Modificación
*   **Manejo de Errores:** Evita el uso de `System.out.println()` para logs o debugging. Utiliza Logging frameworks genéricos o captura de Excepciones del Framework. 
*   **Transactionalidad:** Aquellos servicios que realicen secuencias de lecturas/escrituras cruzadas sensibles (como `VentaService` o `MayoristaService`) deben estar flanqueados por la anotación `@Transactional` proveniente de Spring framework.
*   **Sincronización Bidireccional de JSON:** Usa correctamente `@JsonBackReference` y `@JsonManagedReference` en las `@Entity` para evitar el `StackOverflowException` al serializar peticiones JSON anidadas.

## 🤖 Instrucciones para el Agente IA
Cuando se requiera crear o auditar una nueva capacidad en el sistema:
1. Respeta siempre los patrones mostrados en la sección "Agregates". Si necesitas un DTO de entrada para un controller nuevo, usa "Records" inmutables de Java (`record SignInRequest(...) {}`) en vez de Clases pesadas.
2. Si creas nuevos endpoints HTTP que requieran orígenes cruzados con Frontends no contemplados, usa y edita el `CorsConfigurationSource` global dentro de `SecurityConfiguration` en lugar de agregar anotaciones mágicas como `@CrossOrigin(origins="*")` de grado inseguro sobre el controller.
