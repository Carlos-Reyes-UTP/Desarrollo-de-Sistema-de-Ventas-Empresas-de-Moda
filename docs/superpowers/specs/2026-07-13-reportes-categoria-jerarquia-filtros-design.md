# Diseño: Reportes Categorías — Jerarquía visual y barra de búsqueda

**Fecha:** 2026-07-13  
**Estado:** Aprobado (diseño) — pendiente plan de implementación  
**Alcance:** Tab **Categorías** (`ReportePorCategoria.tsx`). Otras tabs intactas salvo reuso visual de clases existentes de Productos.

---

## Decisiones validadas (brainstorm)

| Tema | Elección |
|------|----------|
| Alcance | **B** — filtros + jerarquía de página (métricas, títulos, breadcrumb) |
| Estilo de búsqueda | **A** — compacto como Productos (fechas + chips + Limpiar ghost) |
| Enfoque técnico | **1** — reutilizar clases `product-report-controls` (sin extraer componente compartido aún) |
| Charts / Export | Sin rediseño; Export Excel sigue en page actions |

---

## Problema y éxito

Hoy el panel “Filtros de Búsqueda” da demasiado peso al botón **Limpiar** (`app-btn-primary`), los chips quedan asimétricos bajo la primera fecha, y el bloque de breadcrumb duplica título + helper (“CATEGORÍAS PRINCIPALES” / “Categorías principales”) con mucha superficie vacía.

**Éxito:**
- En el primer pantallazo se lee: filtros compactos → KPIs con contexto de período → cabecera de nivel (breadcrumb + título único) → pills + gráficos.
- Limpiar es acción secundaria; fechas y chips son el control principal.
- Misma familia visual que Productos (`product-report-controls`).
- Drill-down de categorías y export intactos.

---

## Fuera de alcance

- Rediseño de gráficos (donut, barras, callouts líder/menor rotación).
- Extracción de `ReportDateFilterBar` compartida (posible follow-up).
- Cambios de API / backend.
- Tabs Resumen, Ventas, Productos, Inventario/Demanda.

---

## Composición (arriba → abajo)

1. **Insight banner** — sin cambios (`ReportInsightBanner` si hay insight).
2. **Barra de filtros** — `section.product-report-controls` **sin** fila Ranking/Individual:
   - Grid: Fecha inicio | Fecha fin | Limpiar (`product-report-controls__clear`, no primary).
   - Fila chips: label “Rápido” + Hoy / Últimos 7 días / Últimos 30 días.
   - Lógica existente: cambio de fechas recarga; `limpiarFiltros` → inicio de mes → hoy.
3. **KPI strip** — 3 `DashboardMetricCard` (Categorías|Subcategorías|Líneas, Unidades, Ingresos) con `sub` del rango de fechas activo.
4. **Cabecera de contenido** — un solo bloque (sustituye el `DashboardPanel` breadcrumb actual):
   - Breadcrumb compacto (navegación drill-down).
   - Título principal = nivel actual (sin duplicar el mismo texto como subtitle).
   - Una línea de ayuda contextual (drill-down / nivel hoja).
5. **Pills Resumen | Barras** + paneles/gráficos existentes — sin cambios de contenido.

---

## Cambios de UI específicos

### Filtros
- Eliminar título “Filtros de Búsqueda” del panel card amplio; la barra compacta es el control.
- Limpiar: outline/ghost (`product-report-controls__clear`), alineado al grid de fechas.
- Labels: tipografía de `product-report-controls__label` (más legible que el micro-gris actual).

### Jerarquía de página
- Quitar el panel breadcrumb suelto con título redundante.
- El título del nivel lidera el bloque de contenido; el breadcrumb no compite en peso tipográfico.
- KPI `sub`: texto corto del período (p. ej. `1 Jul 2026 – 13 Jul 2026` o rango ISO formateado es-PE).

---

## Archivos previstos

| Archivo | Cambio |
|---------|--------|
| `front-end/sistemaReact-Main/src/components/reportes/ReportePorCategoria.tsx` | Reemplazo del panel de filtros; cabecera unificada; `sub` en métricas |
| `reports-analytics.css` | Solo si hace falta ajuste mínimo para grid sin columna de categoría (preferir clases existentes) |

Sin componentes nuevos obligatorios. No tocar `ProductReportControls.tsx` salvo que un ajuste CSS compartido sea necesario y no rompa Productos.

---

## Criterios de aceptación

- [ ] Limpiar no usa estilo primary; visualmente secundario a las fechas.
- [ ] Chips y fechas en layout limpio de una sola barra (familia Productos).
- [ ] No hay título duplicado “Categorías principales” + helper idéntico.
- [ ] Breadcrumb drill-down sigue funcionando (atrás / adelante).
- [ ] KPIs muestran conteo/unidades/ingresos y el período en `sub`.
- [ ] Vistas Resumen/Barras y export Excel sin regresión.
- [ ] Productos sigue viéndose igual (reuso de CSS sin romper su grid).

---

## Riesgos

- Reusar `product-report-controls__grid` pensado para 4 columnas (categoría + 2 fechas + clear): en Categorías el grid será solo fechas + clear; validar breakpoints para que no quede hueco raro.
- Si el CSS asume `__top` con segmentado, omitir ese bloque en Categorías (no renderizar `__top`).
