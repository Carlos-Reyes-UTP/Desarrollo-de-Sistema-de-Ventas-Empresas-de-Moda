# Diseño: Reportes Productos — Signal hierarchy × DK soft mono

**Fecha:** 2026-07-13  
**Estado:** Aprobado (implementación) — ranking por **variante** (producto · color · talla), no por producto base  
**Skills:** `redesign-existing-projects` + `design-taste-frontend` (anti-slop) + brainstorming  
**Alcance:** Tab **Productos** (`ProductosMasVendidos` + endpoint `variantes-mas-vendidas`). Otras tabs intactas.

---

## Design Read (taste)

Reading this as: **redesign-overhaul** de la tab Productos del admin **DK-SYSTEM** (moda retail), con la misma familia visual que Resumen Signal DK: **soft-mono boutique + jerarquía de señal**, anclado a tokens `classic` existentes.

**Dials (override producto / admin dens:**

| Dial | Valor | Motivo |
|------|-------|--------|
| `DESIGN_VARIANCE` | 4 | Grid predecible; asimetría solo en dual líderes vs baja rotación |
| `MOTION_INTENSITY` | 3 | Entradas suaves; respeta `prefers-reduced-motion` |
| `VISUAL_DENSITY` | 7 | Ranking denso y legible, sin cockpit de badges/cards |

**Modo redesign:** Overhaul de jerarquía y UI de Productos; **preservar** APIs, export Excel, drill de tallas/colores y tokens de marca.

---

## Decisiones validadas (brainstorm)

| Tema | Elección |
|------|----------|
| Trabajo primario | Ranking del mix: qué lidera y qué se estanca |
| Intensidad | Overhaul jerárquico tipo Resumen Signal DK (enfoque 2) |
| Primer bloque hero | Dual: **Líderes Top 10** \| **Baja rotación Bottom 10** |
| Métrica de orden | Unidades vendidas **a nivel variante**; cada fila muestra también ingresos (S/) |
| Unidad de ranking | **Variante** (`producto · color · talla`), endpoint `GET /variantes-mas-vendidas` |
| Análisis individual | Segundo modo (`Ranking` \| `Individual`), no compite en el fold del ranking |
| Vistas barra / línea / pills paralelas | Eliminar del ranking: el dual + tabla son la lectura principal |
| Enfoque descartado | Polish plano (1) y command center con señal de concentración (3) |

---

## Problema y éxito

La tab Productos actual apila filtros pesados, 4 metric cards, dropdown de tipo de análisis, pills de vista, Top5/Bottom5 duplicados (chart + lista), área-chart y tabla — la jerarquía es plana y el detalle individual pelea el primer viewport.

**Éxito:**
- En &lt;5s el admin lee: controles → KPIs → Top 10 líderes vs Bottom 10 baja rotación (orden por unidades, S/ visible).
- Individual está a un segmento de distancia, no encima del ranking.
- Se siente la misma familia que Resumen Signal DK (tokens, tipografía, motion soft).
- Información completa sigue disponible: dual + tabla ranking + modo individual + export.

---

## Fuera de alcance

- Tabs Resumen / Ventas / Categorías / Inventario y Demanda.
- Endpoints nuevos, MoM de productos, o ranking por ingresos como sort default.
- Rediseño profundo del workbook Excel (solo wire del botón de acción).
- Dark mode dedicado o temas pastel.
- Glass, glows, indigo/purple AI, badges “Líderes/Revisión” competidores.

---

## Composición (arriba → abajo)

1. **Controles compactos** — Categoría principal + fecha inicio/fin + chips Hoy / 7d / 30d + Limpiar secundario. Segmento `Ranking` | `Individual`. Export vía page actions (patrón actual).
2. **Franja KPI (4)** — En ranking, unidades, ingresos, precio promedio. Lenguaje strip/tile de reportes DK; sin iconografía ruidosa.
3. **Hero dual (solo Ranking)** — Panel izquierda: Top 10 por `cantidadVendida`. Panel derecha: Bottom 10 (requiere &gt;10 productos en el set filtrado). Fila: rank + nombre + uds + S/. Mini-barras horizontales monocromas; baja rotación usa rojo sistema + texto (a11y).
4. **Tabla ranking completo (solo Ranking)** — Categoría, código, uds, ingresos, precio prom., acción **Ver**: cambia a segmento Individual con ese producto seleccionado.
5. **Modo Individual** — Al activar el segmento: búsqueda + resultados + drill tallas/colores/variantes (lógica actual). El dual y la tabla ranking no se renderizan a la vez.

Insight copy (`generarInsightProductos`): una línea discreta (banner fino o línea bajo KPIs), no un bloque que robe el hero.

---

## Componentes (extracción sugerida)

Superficie actual: [`ProductosMasVendidos.tsx`](front-end/sistemaReact-Main/src/components/reportes/ProductosMasVendidos.tsx).

| Pieza | Responsabilidad |
|-------|-----------------|
| `ProductReportControls` | Filtros + chips + segmento Ranking \| Individual |
| `ProductMetricStrip` | 4 KPIs del set filtrado |
| `ProductRankDualPanel` | Top 10 + Bottom 10 (orden unidades) |
| `ProductRankTable` | Ranking completo |
| `ProductIndividualMode` | Búsqueda + drill variantes |

Estilos: extender [`reports-analytics.css`](front-end/sistemaReact-Main/src/styles/reports-analytics.css) con clases `product-report-*` alineadas a Resumen; reutilizar `DatePickerPopover`, tokens app, charts Recharts solo dentro del dual (barras horizontales compactas), no área-chart de ingresos como vista alternativa.

---

## Datos y reglas

- Fuente: `ReporteService.getProductosMasVendidos` + filtros periodo/categoría existentes.
- Orden canónico local: `cantidadVendida` desc (no depender del orden del API).
- `top10 = ordered.slice(0, 10)`.
- `bottom10 = ordered.slice(-10).reverse()` solo si `ordered.length > 10`; si no, panel vacío con mensaje fijo: se requieren más de 10 productos para baja rotación.
- Sort **nunca** por ingresos en esta iteración; ingresos son columna/display.
- Export y fetch de tallas/variantes: comportamiento actual.

---

## Motion

- Stagger entrada KPI strip y filas del dual: opacity + `translateY(8–12px)`, 200–280ms.
- Hover fila: fondo muted.
- Cambio Ranking ↔ Individual: crossfade corto del body.
- Si `prefers-reduced-motion: reduce`: sin stagger; fade o cambio instantáneo.

---

## Estados

- **Loading:** skeletons strip + dual + tabla.
- **Error:** mensaje inline centrado (sin `alert`).
- **Vacío ranking:** copy claro si no hay productos en el filtro.
- **Bottom 10 insuficiente:** mensaje en el panel derecho (no inventar datos).

---

## Criterios de aceptación

1. Primer fold muestra controles + KPIs + dual Top10/Bottom10 por unidades con S/ en filas.
2. Segmento Individual no muestra el dual ni la tabla de ranking al mismo tiempo.
3. Sin pills de vista barras/línea/tabla ni área-chart de ingresos en modo Ranking.
4. Tipografía/tokens/motion coherentes con Resumen Signal DK.
5. Filtros rápidos y export siguen funcionando.
6. `prefers-reduced-motion` respetado.

---

## Testing smoke

- Periodo + categoría filtran ranking.
- Set con &gt;10 productos: dual completo; set ≤10: Bottom vacío con mensaje.
- Toggle Ranking ↔ Individual y volver.
- Abrir producto en individual (tallas/colores).
- Export Excel con datos filtrados.
