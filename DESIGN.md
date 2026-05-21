# ESTRUCTURA Y GUÍA DE DISEÑO — DK-SYSTEM
> **Sistema de Ventas para Empresas de Moda (POS & Inventario)**  
> *Última actualización: Mayo 2026*

Este documento consolida la identidad visual, tokens de diseño, principios de UI/UX, animaciones y estándares frontend establecidos para **DK-SYSTEM**. Debe servir como la única fuente de verdad (SSOT) para desarrolladores y agentes de IA al expandir o mantener la interfaz del sistema.

---

## 1. Fundamentos de Identidad Visual
DK-SYSTEM adopta una estética **monocromática premium, minimalista y ultra-limpia (Glassmorphism)**, inspirada en las marcas de moda contemporáneas de gama alta. La interfaz prioriza la legibilidad, las transiciones suaves y un fuerte contraste en los elementos clave.

### 1.1 Tipografía
* **Familia Tipográfica:** `Manrope` como fuente sans-serif primaria.
* **Declaración CSS (`index.css`):**
  ```css
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  ```
* **Jerarquía de Pesos:**
  * `font-light` (300) para subtítulos y descripciones largas.
  * `font-normal` (400) para cuerpo de texto.
  * `font-medium` (500) para etiquetas de formularios y campos interactivos.
  * `font-semibold` (600) para títulos de tarjetas y botones.
  * `font-bold` (700) para encabezados principales e indicadores críticos.

---

## 2. Paleta de Colores Estricta

Para mantener el carácter premium del sistema, está **estrictamente prohibido** inyectar colores aleatorios o vibrantes fuera del sistema de diseño, excepto para estados específicos muy puntuales.

| Elemento de UI | Clase Tailwind 4 / Valor CSS | Propósito / Comportamiento |
| :--- | :--- | :--- |
| **Fondo Principal** | `bg-[#fafafa]` | Lienzo general del sistema. |
| **Fondo de Tarjetas (Cards)** | `bg-white/80` con `backdrop-blur-md` | Efecto vidrio traslúcido satinado. |
| **Texto Principal** | `text-black` o `text-gray-900` | Títulos, párrafos principales y datos destacados. |
| **Texto Secundario** | `text-gray-600` | Subtítulos, descripciones secundarias y marcas de agua. |
| **Bordes** | `border-gray-200` | Líneas de división extremadamente delgadas y limpias. |
| **Hover en Botones** | `hover:bg-gray-100` | Feedback interactivo estándar. |
| **Botón Primario** | `bg-black text-white hover:bg-gray-800` | Acciones de alta jerarquía (Guardar, Confirmar). |
| **Botón Peligro** | `bg-red-500 text-white hover:bg-red-600` | **Exclusivo** para acciones destructivas e irreversibles (Eliminar). |
| **Acento de Navegación** | `--accent: #334155;` (`bg-[#334155]`) | Resaltado para elementos seleccionados en el menú lateral. |

### Colores de Estado (Excepciones Permitidas)
* **Activo / Éxito:** Tonos verdes sutiles (`text-green-600`, `bg-green-50` para insignias).
* **Inactivo / Error / Advertencia:** Tonos rojos/ámbar sutiles (`text-red-600`, `bg-red-50` / `text-amber-600`, `bg-amber-50`).

---

## 3. Reglas Visuales Estrictas (UI/UX Guidelines)

1. **Estética Monocromática Rigurosa:**
   No utilices gradientes arcoíris o paletas de colores excesivas. El negro, el blanco, los grises seleccionados y el efecto traslúcido definen la identidad de DK-SYSTEM.
2. **Glassmorphism Integrado:**
   Las tarjetas principales deben lucir como láminas de vidrio flotantes:
   ```tsx
   className="bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-2xl"
   ```
3. **Bordes Redondeados Amplios:**
   Evita bordes afilados o esquinas duras.
   * Contenedores principales y modales: `rounded-2xl` (1rem) o `rounded-3xl` (1.5rem).
   * Botones y campos de formulario: `rounded-xl` (0.75rem).
4. **Sombras Sutiles:**
   * Tarjetas (Cards): `shadow-sm`.
   * Modales y menús desplegables: `shadow-md` o `shadow-lg` (máximo). No usar sombras negras duras (`shadow-2xl`).
5. **Transiciones Suaves:**
   Cualquier elemento interactivo (`<a>`, `<button>`, `<input>`) debe contar con transiciones graduales:
   ```tsx
   className="transition-all duration-200 ease-in-out"
   ```
6. **Sin Alertas Nativas:**
   Queda **totalmente prohibido** el uso de:
   * `window.alert()`
   * `window.confirm()`
   * `window.prompt()`
   * *Solución:* Usar el componente modular `ConfirmModal` del sistema o notificaciones Toast vía **Sonner** (`toast('Mensaje')`).

---

## 4. Animaciones CSS y Micro-interacciones
La fluidez y dinamismo de la interfaz se garantizan mediante micro-animaciones declaradas en `index.css`:

### 4.1 Entradas y Salidas de Componentes
* **Modales y Diálogos:**
  * `.animate-fadeIn`: Opacidad suave de 0 a 1 en 0.3s.
  * `.animate-scaleIn`: Efecto zoom desde 95% a 100% en 0.3s.
  * `.animate-fadeOut` / `.animate-scaleOut`: Salidas sutiles.
* **Componentes de Lista y Cards:**
  * `.animate-slideUpFade`: Entrada desde abajo con opacidad en 0.32s (`cubic-bezier(0.22, 1, 0.36, 1)`).
  * `.animate-fadeInRight`: Entrada lateral desde la derecha para paneles laterales o notificaciones en 0.3s.
  * `.animate-fadeInUp`: Entrada vertical suave en 0.3s.
  * `.animate-bounce-in`: Para estados completados, checks de éxito o notificaciones emergentes.

### 4.2 Cargas de Datos (Skeletons Shimmer)
Para evitar la frustración de la carga, se usan pantallas y bloques esqueleto con brillo deslizante:
* **Fondo Claro:** `.skeleton-shimmer` (brillo suave sobre gris claro).
* **Fondo Muted:** `.skeleton-shimmer-muted` (para zonas con menor peso visual).
* **Fondo Oscuro:** `.skeleton-shimmer-dark` (para elementos con fondo negro/oscuro).

---

## 5. Barras de Desplazamiento Personalizadas (Scrollbars)
Para mantener la elegancia visual incluso al hacer scroll, se eliminan las barras predeterminadas del navegador y se aplican estilos ultra-delgados y redondeados:

### 5.1 Scrollbar del Carrito de Ventas
* **Clase:** `.carrito-scroll`
* Barra de ancho ultra-delgado (`6px`), pista clara (`#f1f5f9`) y tirador gris suave redondeado (`#cbd5e1`), el cual se oscurece a (`#94a3b8`) en hover.

### 5.2 Scrollbar Global
* Barra de ancho controlado (`20px`), pista transparente para no interrumpir el fondo, y un tirador negro sólido (`#000`) muy redondeado con márgenes transparentes (`border: 6px solid transparent`), logrando un efecto flotante y sofisticado.

---

## 6. Iconografía y Componentes de Terceros
* **Librería de Iconos Primaria:** `Lucide React` (versión `0.511`).
* **Librería Secundaria:** `Heroicons` (versión `2.2`).
* **Gráficos y Reportes:** `Recharts` (versión `3.1`), usando colores directos hex o HSL configurados en el objeto `chartConfig`.
* **Exportación de Datos:** `xlsx` (versión `0.18`) para descargas de reportes limpios en formato Excel.

---

## 7. Mapeo de Componentes Clave y Dominio de UI

| Componente | Rol de Diseño Aplicado | Ubicación |
| :--- | :--- | :--- |
| **Menú Lateral (Sidebar)** | Fijo, fondo blanco/80, borde derecho sutil, enlaces con hover y acento slate (`--accent`). | `src/components/layout/SidebarMenu.tsx` |
| **Punto de Venta (POS)** | Layout dividido, carrito con scrollbar especial, botones grandes de método de pago de estilo monocromático. | `src/pages/CajeroSistemaVentas.tsx` |
| **Formulario de Producto** | Pestañas superiores estilizadas, selector de tallas y colores interactivo, chips de estado. | `src/components/productos/FormularioProductoUnificado.tsx` |
| **Modales de Confirmación** | Backdrop blur completo (`bg-black/40 backdrop-blur-sm`), tarjetas centradas con entrada elástica. | `src/components/shared/ConfirmModal.tsx` (o equivalente) |

---

### Recordatorio para Desarrolladores y Agentes de IA
> [!IMPORTANT]
> Al diseñar pantallas nuevas, **nunca** uses Tailwind CSS inline para cambiar colores primarios (por ejemplo, `bg-blue-600 text-white`). En su lugar, apégate a la paleta monocromática: **`bg-black text-white hover:bg-gray-800`**. La consistencia visual es lo que confiere a DK-SYSTEM su aspecto premium y profesional.
