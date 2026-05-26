# Manual de Instalación Local — ISV_INV_2026 (DK-SYSTEM)

> **Proyecto:** Sistema de Inventario y Ventas — Empresas de Moda  
> **Repositorio:** `Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda`  
> **Stack:** Spring Boot 3.4.6 (Java 21) + PostgreSQL + React 19 / Vite 6  
> **Fuente:** Parámetros extraídos del código (Mayo 2026)

---

## Requisitos previos

| Componente | Versión / nota |
|------------|----------------|
| **Java** | 21 |
| **PostgreSQL** | Acceso en `localhost:5432` |
| **Node.js + npm** | Para el frontend (`front-end/sistemaReact-Main`) |
| **Maven** | Opcional; el backend incluye **Maven Wrapper** |

---

## 1. Base de datos (PostgreSQL)

**Archivo de configuración:** `Back-End/src/main/resources/application.properties`  
(No existe `application.yml` en el proyecto.)

### Parámetros por defecto

| Parámetro | Valor |
|-----------|--------|
| **Nombre de la base** | `tiendaropadk` |
| **Host / puerto** | `localhost:5432` |
| **Usuario** | `postgres` |
| **Contraseña** | `Septiembre3` |

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/tiendaropadk
spring.datasource.username=postgres
spring.datasource.password=Septiembre3
```

### Inicialización del esquema

El sistema usa **Flyway** y aplica las migraciones **automáticamente** al arrancar el backend. **No** es necesario ejecutar scripts SQL manuales para crear tablas en un despliegue normal.

- Migraciones en: `Back-End/src/main/resources/db/migration/`
- `spring.jpa.hibernate.ddl-auto=none` → Hibernate **no** crea tablas; el esquema lo gestiona Flyway.
- `FlywayConfig` ejecuta `repair()` y luego `migrate()` en cada arranque.
- `spring.flyway.baseline-on-migrate=true` y `spring.flyway.out-of-order=true` facilitan bases con historial previo.

**Paso manual obligatorio:** crear en PostgreSQL la base de datos vacía `tiendaropadk` y asegurar que el usuario `postgres` tenga permisos. Flyway crea y actualiza el esquema al iniciar Spring Boot.

Ejemplo (psql):

```sql
CREATE DATABASE tiendaropadk;
```

---

## 2. Backend (Spring Boot)

### Puerto por defecto

| Servicio | Puerto |
|----------|--------|
| **API Spring Boot** | **8080** |

No hay `server.port` en `application.properties`; Spring Boot usa el puerto por defecto **8080**. El frontend está configurado para apuntar a ese puerto.

### Compilación y ejecución

El proyecto **incluye Maven Wrapper** en `Back-End/`:

- Windows: `mvnw.cmd`
- Linux / macOS: `./mvnw`

No es obligatorio tener Maven instalado globalmente.

**Compilar el JAR:**

```powershell
cd Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\Back-End
.\mvnw.cmd clean package -DskipTests
```

**Artefacto generado:** `target/ropa-0.0.1-SNAPSHOT.jar` (según `pom.xml`: `artifactId=ropa`, `version=0.0.1-SNAPSHOT`).

**Ejecutar:**

```powershell
java -jar target\ropa-0.0.1-SNAPSHOT.jar
```

Al arrancar, Flyway aplicará las migraciones si la base `tiendaropadk` existe y es accesible.

---

## 3. Frontend (React + Vite)

**Ruta del proyecto:** `front-end/sistemaReact-Main/`

### URL base del backend

No existen archivos `.env` ni `.env.production`. La URL está **hardcodeada** en:

`front-end/sistemaReact-Main/src/config/apiConfig.ts`

```typescript
export const API_BASE_URL = 'http://localhost:8080';
```

Todas las rutas de la API (`RUTAS_AUTENTICACION`, `RUTAS_PRODUCTOS`, etc.) se construyen a partir de esa constante.

### Proxy de Vite (solo desarrollo)

En `vite.config.ts`, el proxy redirige `/api` → `http://localhost:8080` en modos `dev` y `preview`. En **producción** (`npm run build`), el bundle usa las URLs absolutas de `apiConfig.ts`; el proxy **no** aplica.

### Apuntar a una IP local en producción (ej. `192.168.1.10`)

**Hoy no hay variable de entorno configurada** para la URL de la API. Opciones:

1. **Editar** `apiConfig.ts` antes del build:

   ```typescript
   export const API_BASE_URL = 'http://192.168.1.10:8080';
   ```

2. **O** implementar el patrón Vite (no está en el código actual):
   - Crear `.env.production` con: `VITE_API_BASE_URL=http://192.168.1.10:8080`
   - Cambiar `apiConfig.ts` a:  
     `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';`

**Variable de entorno a modificar hoy:** ninguna definida; el cambio efectivo es en **`apiConfig.ts`**.

### CORS

Si el frontend se sirve desde otro host o puerto que el backend, revisar la configuración CORS en `SecurityConfiguration` para permitir el origen del cliente en red LAN.

---

## 4. package.json — Scripts de build

**Archivo:** `front-end/sistemaReact-Main/package.json`

| Script | Comando exacto |
|--------|----------------|
| **Build de producción** | `npm run build` → `tsc -b && vite build` |
| Desarrollo | `npm run dev` → `vite` |
| Vista previa del build | `npm run preview` → `vite preview` |
| Lint | `npm run lint` → `eslint .` |
| Tests | `npm run test` → `vitest run` |
| Tests en watch | `npm run test:watch` → `vitest` |

### Instalación y build del frontend

```bash
cd Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda/front-end/sistemaReact-Main
npm install
npm run build
```

**Salida:** carpeta `dist/` (servir con nginx, IIS, `vite preview`, etc.).

---

## Orden recomendado de instalación local

1. Instalar **Java 21** y **PostgreSQL**.
2. Crear la base de datos **`tiendaropadk`**.
3. (Opcional) Ajustar credenciales en `application.properties` o variables de entorno.
4. Compilar y ejecutar el **backend** (`mvnw.cmd clean package` → `java -jar ...`).
5. Verificar que la API responde en `http://localhost:8080`.
6. Ajustar **`API_BASE_URL`** en `apiConfig.ts` si el backend no está en localhost.
7. `npm install` y **`npm run build`** en el frontend.
8. Servir el contenido de **`dist/`** y probar login contra la API.

---

## Notas de seguridad (producción / LAN)

- Las credenciales de BD y la clave JWT están en `application.properties`; en entornos reales conviene externalizarlas (variables de entorno o `application-prod.properties`).
- No commitear contraseñas reales de producción en el repositorio.
- Documentar en el manual del cliente cualquier cambio de `security.jwt.key` (invalida tokens existentes).

---

## Referencias en el repositorio

| Tema | Ruta |
|------|------|
| Configuración backend | `Back-End/src/main/resources/application.properties` |
| Migraciones Flyway | `Back-End/src/main/resources/db/migration/` |
| Config API frontend | `front-end/sistemaReact-Main/src/config/apiConfig.ts` |
| Vite / proxy | `front-end/sistemaReact-Main/vite.config.ts` |
| Arquitectura ISV | `docs/ISV_INV_2026-IV-arquitectura-componentes.md` |
