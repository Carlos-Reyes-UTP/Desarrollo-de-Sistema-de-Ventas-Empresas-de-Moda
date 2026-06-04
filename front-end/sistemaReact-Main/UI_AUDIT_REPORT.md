# Reporte de Auditoría de UI (Themes y Componentes)

## 1. Resumen de Hallazgos

Durante la auditoría visual y técnica de la aplicación React (`sistemaReact-Main`), se identificó que el sistema de temas (Light, Dark, Pastel) presentaba diversas deficiencias al intentar renderizar en modos no convencionales (Dark/Pastel). Las incidencias más frecuentes consistían en **colores codificados (hardcoded)** y transiciones de estados que ignoraban las variables CSS de entorno.

## 2. Inconsistencias Específicas Encontradas

### A. Uso de clases "bg-white" y "bg-black"
Múltiples componentes estructurales estaban utilizando clases fijas como `bg-white`, `bg-black`, y fondos grises estáticos (`bg-[#f8f8f8]`, `bg-gray-50`) que no respetaban la superficie del tema activo.

**Archivos más afectados:**
- `src/components/productos/GestionVariantes.tsx`
- `src/components/productos/FormularioProducto.tsx`
- `src/components/productos/formulario/InformacionTab.tsx`
- `src/components/productos/formulario/VariantesTab.tsx`
- `src/components/almacen-tablero/*`
- `src/components/categorias/GestionCategorias.tsx`
- `src/components/mayoristas/ModalHacerMayorista.tsx`

**Solución aplicada:**
Se mapearon las variables globales en `tailwind.config.js` y se procedió a reemplazarlas de la siguiente forma:
- `bg-white` → `bg-app-surface`
- `bg-black` → `bg-app-accent`
- `text-black` → `text-app-text`
- `text-white` → `text-app-accent-fg`
- `bg-[#f8f8f8]` y similares → `bg-app-input`

### B. Consistencia de Hover en Botones y Filas
Las tablas de gestión (como la de *GestionProductos*) y botones secundarios usaban pseudo-clases estáticas como `hover:bg-gray-100` o `hover:text-black`, lo cual, en el modo oscuro, producía combinaciones ilegibles (por ejemplo: letra negra sobre fondo gris oscuro o blanco que ocultaba la información).

**Solución aplicada:**
- `hover:bg-gray-100` → `hover:bg-app-hover-overlay`
- Se actualizaron los bordes de `border-gray-200` a `border-app-border` para mantener el contraste correcto.

### C. Excepción: Pantalla de Login
Tal y como fue indicado por las especificaciones, el `Login` se mantuvo aislado y no se afectó por estas transformaciones para garantizar que siempre preserve su diseño original por defecto.

## 3. Estado de la Aplicación y Recomendaciones

- **Estado Actual**: Todos los modales principales, formularios de productos, vistas de almacén y tablas de gestión han sido purgados de colores estáticos que interrumpían los temas dinámicos.
- **Compilación**: El proyecto compila satisfactoriamente (Zero compilation errors after modifications).
- **Siguientes Pasos (Recomendación)**: Continuar iterando sobre nuevos componentes utilizando siempre la nomenclatura `app-*` (`bg-app-surface`, `bg-app-input`, `text-app-text`) para no acumular deuda técnica visual y evitar la ruptura del layout en futuras actualizaciones.
