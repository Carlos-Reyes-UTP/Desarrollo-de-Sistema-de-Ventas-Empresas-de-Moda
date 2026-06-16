# MANUAL DE INSTALACIÓN, DESPLIEGUE Y CONFIGURACIÓN DEL SISTEMA (DK-SYSTEM)

---

## INDICE GENERAL

*   **I. INTRODUCCIÓN**
    *   1.1. Propósito del Documento
    *   1.2. Alcance
*   **II. TOPOLOGÍA DE RED Y REQUISITOS DEL SISTEMA**
    *   2.1. Arquitectura Física (Cliente-Servidor LAN)
    *   2.2. Requisitos de Hardware y Software (Servidor Central)
        *   2.2.1. Hardware Mínimo Recomendado
        *   2.2.2. Software Requerido
    *   2.3. Requisitos de Terminales Cliente
        *   2.3.1. Terminales de Caja y Almacén (Fijas)
        *   2.3.2. Dispositivos de Vendedores de Campo (Móviles)
*   **III. INSTALACIÓN DEL SERVIDOR CENTRAL (BACKEND Y BASE DE DATOS)**
    *   3.1. Configuración de PostgreSQL
    *   3.2. Configuración de Variables y Compilación de Spring Boot
    *   3.3. Ejecución del Servicio y Migraciones Flyway
*   **IV. COMPILACIÓN Y DESPLIEGUE DEL FRONTEND (REACT + PWA)**
    *   4.1. Configuración de Enrutamiento IP (`apiConfig.ts`)
    *   4.2. Construcción del Bundle de Producción (Vite)
    *   4.3. Despliegue en Servidor Web Estático Local
*   **V. CONFIGURACIÓN DE TERMINALES DE USUARIO**
    *   5.1. Personal Operativo: Cajas y Almacén (Modo Quiosco y Auto-arranque)
    *   5.2. Vendedores de Campo: Instalación Móvil (PWA vía Wi-Fi)
    *   5.3. Personal Administrativo y Gerencial: Acceso Estándar
*   **VI. MANTENIMIENTO Y SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)**
    *   6.1. Gestión de IPs Dinámicas y Fallos de Red
    *   6.2. Reinicio Seguro de Servicios

---

## I. INTRODUCCIÓN

### 1.1. Propósito del Documento
Este documento constituye el manual oficial de instalación, despliegue y puesta en marcha de **DK-SYSTEM**, un sistema web integrado para la gestión de ventas, inventarios y planificación inteligente de compras mediante Inteligencia Artificial (IA) en empresas del sector moda. El objetivo es guiar al equipo de sistemas o administradores en el montaje del Servidor Central en una red local (LAN) y en la posterior provisión y configuración de los clientes operativos.

### 1.2. Alcance
El alcance abarca:
1.  La instalación física y lógica de la base de datos PostgreSQL, el Backend Spring Boot y el microservicio de Inteligencia Artificial (FastAPI) en el **Servidor Central**.
2.  La compilación del Frontend React configurando el acceso mediante direcciones IP locales fijas.
3.  La provisión de la Progressive Web App (PWA) para clientes fijos (modo quiosco) y dispositivos móviles de ventas de campo.
4.  Planes de contingencia básicos y troubleshooting frente a desconexiones físicas o cambios en la infraestructura de red LAN.

---

## II. TOPOLOGÍA DE RED Y REQUISITOS DEL SISTEMA

### 2.1. Arquitectura Física (Cliente-Servidor LAN)
El sistema opera bajo un modelo Cliente-Servidor local. Toda la base lógica, almacenamiento y analítica de datos se concentra en un único host denominado **Servidor Central**, el cual debe poseer una dirección IP estática o reservada en el enrutador local (ej. `192.168.1.100`).

```
                    [ DISPOSITIVOS CLIENTE ]
 +------------------------------------------------------------+
 |                                                            |
 |   +-------------------+              +-----------------+   |
 |   | Terminal Cajas    |              | Terminal        |   |
 |   | (PC Fija LAN)     |              | Almacén (LAN)   |   |
 |   +---------+---------+              +--------+--------+   |
 |             |                                 |            |
 |             +----------------+----------------+            |
 |                              |                             |
 |                     [ Switch / Router ]                    |
 |                              | (Wi-Fi)                     |
 |             +----------------+----------------+            |
 |             |                                 |            |
 |   +---------v---------+              +--------v--------+   |
 |   | Vendedor Móvil    |              | Admin / Gerente |   |
 |   | (Smartphone/Tablet|              | (Acceso Web)    |   |
 |   +-------------------+              +-----------------+   |
 +------------------------------------------------------------+
                                |
                      [ SERVIDOR CENTRAL ]
 +------------------------------------------------------------+
 |  IP Local Estática: 192.168.1.100                          |
 |                                                            |
 |     +------------------+             +------------------+  |
 |     |   Spring Boot    <------------->  FastAPI (IA)    |  |
 |     |  (Backend 8080)  |             |  (Puerto 8000)   |  |
 |     +--------^---------+             +------------------+  |
 |              |                                             |
 |     +--------v---------+                                   |
 |     | PostgreSQL (5432)|                                   |
 |     +------------------+                                   |
 +------------------------------------------------------------+
```

---

### 2.2. Requisitos de Hardware y Software (Servidor Central)

#### 2.2.1. Hardware Mínimo Recomendado:
*   **Procesador (CPU):** Intel Core i5 / AMD Ryzen 5 o superior (mínimo 4 núcleos físicos).
*   **Memoria RAM:** Mínimo 16 GB (para soportar simultáneamente la ejecución de la JVM de Spring Boot, la base de datos transaccional y la carga en memoria RAM de los modelos regresores de XGBoost de Python).
*   **Almacenamiento:** Unidad de Estado Sólido (SSD) con al menos 100 GB libres.
*   **Conectividad:** Tarjeta de red Ethernet Gigabit integrada conectada directamente al switch principal mediante cable Categoría 6.

#### 2.2.2. Software Requerido:
*   **Sistema Operativo:** Windows Server 2019/2022 o Ubuntu 22.04 LTS (recomendado).
*   **Java Development Kit (JDK):** Versión 17 o posterior (OpenJDK 17).
*   **Motor de Base de Datos:** PostgreSQL 14 o 15.
*   **Python:** Versión 3.9 a 3.11.
*   **Servidor Web Estático (Frontend):** Nginx o Apache HTTP Server.

---

### 2.3. Requisitos de Terminales Cliente

#### 2.3.1. Terminales de Caja y Almacén (Fijas):
*   **Hardware:** Computador de escritorio con procesador dual-core, 4 GB de RAM y monitor con resolución mínima de 1366x768 píxeles.
*   **Software:** Navegador Google Chrome u Microsoft Edge actualizado a la última versión. Conectividad LAN por cable.

#### 2.3.2. Dispositivos de Vendedores de Campo (Móviles):
*   **Hardware:** Smartphone o Tablet con pantalla mínima de 5.5 pulgadas y soporte Wi-Fi de 5 GHz.
*   **Software:** Android 10+ (con Chrome) o iOS 15+ (con Safari). Conectividad inalámbrica estable a la red Wi-Fi local.

---

## III. INSTALACIÓN DEL SERVIDOR CENTRAL (BACKEND Y BASE DE DATOS)

### 3.1. Configuración de PostgreSQL
1.  Instale PostgreSQL utilizando los instaladores oficiales y configure el servicio para iniciarse automáticamente.
2.  Acceda a la herramienta de administración `pgAdmin` o a la consola `psql` e inicie sesión con la cuenta administrativa (`postgres`).
3.  Cree una base de datos exclusiva para el sistema con el nombre de `tiendadakani`:
    ```sql
    CREATE DATABASE tiendadakani WITH OWNER = postgres ENCODING = 'UTF-8';
    ```

---

### 3.2. Configuración de Variables y Compilación de Spring Boot
1.  Diríjase a la ruta del backend (`Back-End/src/main/resources/`) y configure el archivo de propiedades `application.properties`:
    ```properties
    # Configuración de Base de Datos
    spring.datasource.url=jdbc:postgresql://localhost:5432/tiendadakani
    spring.datasource.username=postgres
    spring.datasource.password=tu_contrasena_segura
    spring.datasource.driver-class-name=org.postgresql.Driver

    # Configuración de Migraciones Flyway
    spring.flyway.enabled=true
    spring.flyway.baseline-on-migrate=true

    # Rutas e Integración de Inteligencia Actorial (MLOps)
    # Ruta absoluta donde el servidor escribirá el archivo transaccional de ventas
    dakani.mlops.csv-path=c:/Users/Gonzalo/Desktop/proyectoIntegrador/dakani/api_ia/ventas_crudas.csv
    # URL del microservicio de entrenamiento de la IA (puerto local por defecto de FastAPI)
    dakani.mlops.fastapi-url=http://localhost:8000/entrenar_modelo
    ```
2.  Abra una consola de comandos en la carpeta raíz del Back-End y compile el código fuente para generar el artefacto `.jar`:
    - En Windows: `mvnw.cmd clean package -DskipTests`
    - En Linux: `./mvnw clean package -DskipTests`

---

### 3.3. Ejecución del Servicio y Migraciones Flyway
1.  Una vez generado el archivo `.jar` ejecutable dentro de la carpeta `target/` (ej. `ropa-0.0.1-SNAPSHOT.jar`), ejecute el backend:
    ```bash
    java -jar target/ropa-0.0.1-SNAPSHOT.jar
    ```
2.  Al inicializar, **Flyway** detectará automáticamente el estado de la base de datos PostgreSQL y ejecutará de forma secuencial los scripts SQL ubicados en `src/main/resources/db/migration` para crear las tablas, relaciones, triggers e inyecciones iniciales del sistema.
3.  Verifique en la salida de consola que el servidor Spring Boot está escuchando en el puerto `8080`.

---

## IV. COMPILACIÓN Y DESPLIEGUE DEL FRONTEND (REACT + PWA)

### 4.1. Configuración de Enrutamiento IP (`apiConfig.ts`)
Para que los clientes de la red local puedan comunicarse con la API del servidor central, debe reemplazar la dirección de bucle local (`localhost`) por la IP estática local del Servidor Central.

1.  Abra el archivo `front-end/sistemaReact-Main/src/config/apiConfig.ts`.
2.  Actualice la constante `API_BASE_URL` con la IP del Servidor Central:
    ```typescript
    // Modificar con la dirección IP fija del Servidor en la Red Local
    export const API_BASE_URL = 'http://192.168.1.100:8080';
    ```

---

### 4.2. Construcción del Bundle de Producción (Vite)
1.  Abra una consola en la ruta `front-end/sistemaReact-Main/`.
2.  Instale los paquetes de Node.js necesarios:
    ```bash
    npm install
    ```
3.  Genere los archivos optimizados y listos para producción. Esto creará el Service Worker de la PWA y compilará el HTML, CSS y JS en la carpeta `/dist`:
    ```bash
    npm run build
    ```

---

### 4.3. Despliegue en Servidor Web Estático Local
Para servir los archivos estáticos en la red LAN local, se recomienda utilizar **Nginx**.

1.  Instale Nginx en el Servidor Central.
2.  Copie la totalidad de los archivos ubicados dentro de la carpeta `dist/` de React y péguelos en el directorio raíz web de Nginx:
    - En Windows: `C:\nginx\html\`
    - En Linux: `/var/www/html/`
3.  Configure el archivo `nginx.conf` para redireccionar todas las rutas desconocidas hacia `index.html` (necesario para el correcto enrutamiento en aplicaciones Single Page Application o SPA):
    ```nginx
    server {
        listen       80;
        server_name  192.168.1.100;

        location / {
            root   /var/www/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # Redireccionar peticiones al Backend
        location /api {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```
4.  Inicie o recargue el servicio Nginx. Ahora cualquier máquina en la red local podrá ingresar escribiendo `http://192.168.1.100` en su navegador web.

---

## V. CONFIGURACIÓN DE TERMINALES DE USUARIO

### 5.1. Personal Operativo: Cajas y Almacén (Modo Quiosco y Auto-arranque)
Para asegurar que los terminales fijos se utilicen exclusivamente para la venta y control físico de mercadería, configure los equipos de la siguiente manera:

1.  **Auto-arranque:** Cree un acceso directo a Google Chrome en la carpeta de inicio de Windows (`Shell:startup`).
2.  **Configuración Modo Quiosco:** Modifique el destino del acceso directo para que cargue la aplicación a pantalla completa y bloquee el uso del navegador externo:
    ```cmd
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://192.168.1.100
    ```
3.  **Bloqueo de Teclado:** Utilice políticas de grupo locales (GPO) para inhabilitar combinaciones del teclado como `Alt+F4` o `Ctrl+Alt+Supr` en la cuenta de usuario limitado de caja.

---

### 5.2. Vendedores de Campo: Instalación Móvil (PWA vía Wi-Fi)
Dado que la aplicación incluye un manifiesto PWA compilado, los vendedores pueden instalarla directamente en sus smartphones corporativos:

1.  Conecte el dispositivo móvil de ventas de campo a la red Wi-Fi de la empresa.
2.  Abra el navegador móvil y cargue el enlace del sistema: `http://192.168.1.100`.
3.  **Instalación:**
    - **En Android (Chrome):** Presione en el banner inferior o pulse los tres puntos de configuración y seleccione **"Agregar a la pantalla principal"**.
    - **En iOS (Safari):** Presione el botón **Compartir** en la barra de navegación y seleccione **"Añadir a la pantalla de inicio"**.
4.  A partir de este momento, se creará un icono de acceso directo en la pantalla del celular que ejecutará el sistema de forma nativa e independiente, eliminando la barra de navegación del navegador móvil.

---

### 5.3. Personal Administrativo y Gerencial: Acceso Estándar
*   Los gerentes y personal administrativo pueden ingresar desde sus computadoras de oficina mediante cualquier navegador estándar utilizando la dirección IP local de red del servidor `http://192.168.1.100`. No se requiere ninguna instalación de software adicional en sus terminales.

---

## VI. MANTENIMIENTO Y SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

### 6.1. Gestión de IPs Dinámicas y Fallos de Red
*   **Problema:** Los terminales cliente pierden repentinamente el acceso al sistema lanzando un error de conexión (Timeout o Servidor no Encontrado).
*   **Causa:** El enrutador local de la tienda reinició sus tablas DHCP y le asignó una nueva dirección IP al Servidor Central (ej. cambió de `192.168.1.100` a `192.168.1.105`).
*   **Solución Permanente:**
    1.  Acceda a la consola de administración del Router local.
    2.  Busque el menú **DHCP Server -> Address Reservation** (Reserva de IP).
    3.  Vincule la dirección MAC física de la tarjeta de red del Servidor Central con la dirección IP `192.168.1.100`.
    4.  Reinicie el enrutador y el Servidor Central para fijar los cambios.
*   **Solución Temporal (en caso de no tener acceso al Router):**
    *   Deberá actualizar el archivo `apiConfig.ts` de React con la nueva IP dinámica asignada, volver a compilar con `npm run build` y redistribuir el bundle estático en el servidor web.

---

### 6.2. Reinicio Seguro de Servicios
Si el Servidor Central es apagado por cortes eléctricos o mantenimiento programado, la secuencia correcta para levantar los servicios y garantizar que no haya pérdidas de información ni desincronización de la Inteligencia Artificial es la siguiente:

1.  **Paso 1: Levantar PostgreSQL.** Verifique que el servicio de base de datos se inicie de forma prioritaria en el puerto 5432.
2.  **Paso 2: Iniciar el Microservicio de Python (FastAPI).** El pipeline de IA debe estar listo y escuchando en el puerto 8000 antes de levantar la aplicación Java para evitar fallos de conexión iniciales.
3.  **Paso 3: Arrancar el Backend (Spring Boot).** Ejecute el archivo `.jar` de producción.
4.  **Paso 4: Iniciar Nginx / Servidor Web.** Ponga en marcha el servidor Nginx para liberar el frontend al puerto 80 de los clientes.
