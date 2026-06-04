## 2026-06-04T20:45:37Z

# Teamwork Project Prompt — Draft

> Status: Step 9 — Revisión final antes de lanzamiento
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Auditar el código del front-end React para encontrar y documentar inconsistencias en los temas (themes), fallos en botones, efectos de hover rotos y bugs visuales generales.
El equipo debe generar un reporte detallado con las ubicaciones exactas de los problemas y sugerencias de corrección, sin alterar el código fuente.

Working directory: c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main
Integrity mode: development

## Requirements

### R1. Auditoría de Temas y CSS
Revisar la integración entre TailwindCSS y los archivos CSS personalizados (`src/index.css`, `src/styles/app-themes.css`, etc.). Identificar variables CSS no definidas, colores harcodeados (hex/rgb directos) en los componentes que deberían usar variables del tema, y conflictos donde las clases de Tailwind son anuladas incorrectamente.

### R2. Consistencia en Botones y Estados Interactivos
Analizar los componentes UI para detectar inconsistencias en botones y elementos interactivos. Buscar elementos clickeables que carezcan de estados `:hover`, `:active`, `:focus` o `:disabled` definidos correctamente. Verificar si se están aplicando adecuadamente las clases de transición globales (como `.transition-google` u otras definidas en el CSS).

### R3. Detección de Bugs Visuales Estructurales
Identificar problemas potenciales de diseño, tales como elementos con `z-index` conflictivo, problemas de legibilidad o contraste, animaciones que causen saltos de layout (reflows), y modales o contenedores con comportamientos de scroll defectuosos.

### R4. Entregable: Reporte de Auditoría
El equipo **no debe realizar cambios en el código**. Debe generar un único archivo llamado `UI_AUDIT_REPORT.md` en la raíz del proyecto React (`sistemaReact-Main`). Este archivo debe documentar exhaustivamente cada hallazgo.

## Acceptance Criteria

### Validación del Reporte
- [ ] El archivo `UI_AUDIT_REPORT.md` se generó exitosamente en la raíz del proyecto.
- [ ] El reporte contiene referencias exactas a archivos y líneas de código donde ocurren las inconsistencias.
- [ ] Cada problema reportado incluye una descripción clara de por qué es un problema (ej. "Falta estado hover", "Color harcodeado rompe el tema oscuro").
- [ ] Cada hallazgo incluye un snippet de código con la solución sugerida.
- [ ] El código fuente de la aplicación (archivos `.tsx`, `.ts`, `.css`) **no** fue modificado.

---
*Next: cuando el usuario apruebe → delegar via invoke_subagent (teamwork_preview)*

## 2026-06-04T20:51:41Z

Hubo un reinicio del servidor y tu tarea fue interrumpida. Por favor, retoma la auditor�a de UI donde te quedaste y aseg�rate de completar y guardar el archivo UI_AUDIT_REPORT.md en la ra�z del proyecto (c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main) con los hallazgos.
