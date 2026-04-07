# Contexto del Proyecto Frontend - DK-SYSTEM

Este documento sirve como referencia de memoria y contexto para cualquier Agente de IA que trabaje en la capa Frontend del sistema.

## 🛠️ Stack Tecnológico
- **Framework:** React.js con TypeScript (`.tsx`, `.ts`).
- **Estilos:** Tailwind CSS.
- **Iconos:** Lucide React.
- **Ruteo:** React Router DOM (presumiblemente).
- **Consumo de APIs:** Axios / Fetch API.
- **Gestión de Estado global:** Context API (AuthContext para manejo del token JWT).

## 🏗️ Arquitectura y Estructura de Directorios (Aproximada)

```text
front-end/sistemaReact-Main/
├── src/
│   ├── components/         # Componentes reutilizables y modulares.
│   │   ├── productos/      # Subsistema de inventario (GestionColores, GestionTallas, etc).
│   │   ├── layout/         # Componentes de estructura (SidebarMenu, Topbar).
│   │   ├── common/         # Componentes genéricos (Alertas, Modales universales).
│   │   └── ...
│   ├── pages/              # Vistas principales atadas a rutas (Login, GestionUsuarios, etc).
│   ├── context/            # Estados globales (ej. AuthProvider, Usuario actual).
│   ├── types/              # Interfaces globales de TypeScript.
│   └── App.tsx             # Punto de entrada y definición de enrutamiento.
```

## 📐 Convenciones de Diseño (UI/UX)
1. **Paleta de Colores:** Monocromática, minimalista y profesional. Fondo principal: `#fafafa`, textos en negro intenso o grises oscuros (`text-gray-900`, `text-gray-600`).
2. **Efectos:** Uso de bordes suaves (`rounded-2xl` o `rounded-3xl`), sombras sutiles (`shadow-sm`, `shadow-md`), y efectos de cristal (`backdrop-blur-md`, `bg-white/80`).
3. **Interacciones:** Hover effects evidentes en botones e íconos (ej: `hover:bg-gray-100`, `transition-all`).
4. **Alertas:** **NO usar `window.alert()` ni `window.confirm()`**. El sistema utiliza componentes modales customizados (ej. `ConfirmModal`) para interactuar con el usuario.

## 🔒 Lógica de Negocio y Seguridad
- **Autenticación (JWT):** Las credenciales viajan en el header de autorización `Bearer <token>`.
- **Interacción con Backend:** El frontend interactúa directamente con el backend de Spring Boot alojado localmente.
- Cualquier operación destructiva (borrado/pérdida de inventario pre-guardado) requiere un `ConfirmModal`.

## 🤖 Instrucciones para Agentes (Directrices de modificación)
*   **Modularidad:** No engrosar los archivos `.tsx` principales. Si un componente (ej: página de Gestión) supera las 250 líneas, debes sugerir dividirlo creando subcomponentes.
*   **Consistencia TypeScript:** Todo objeto o respuesta de API debe estar tipado mediante Interfaces, evitando el uso del tipo `any`.
*   **Diseño:** Cualquier nuevo componente UI DEBE respetar la paleta monocromática estipulada en la sección de Convenciones de Diseño. No inyectes colores vibrantes a menos que se trate de etiquetas de estado específicas (ej. Activo/Inactivo).
