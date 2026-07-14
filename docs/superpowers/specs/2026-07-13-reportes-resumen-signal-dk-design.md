# Diseño: Resumen Reportes — Signal hierarchy × DK soft mono

**Fecha:** 2026-07-13  
**Estado:** Pendiente revisión de usuario  
**Skills:** `design-taste-frontend` (anti-slop + redesign protocol) + KPI hierarchy  
**Alcance:** Tab Resumen + chrome del command deck en Reportes. Otras tabs intactas.

---

## Design Read (taste)

Reading this as: **redesign-overhaul** del Resumen admin de **DK-SYSTEM** para administradores de moda retail, con lenguaje **soft-mono boutique + jerarquía de señal ejecutiva**, anclado a tokens `classic` existentes (no a un “signal board” genérico tipo Carbon/teal).

**Dials (override producto, no marketing baseline):**

| Dial | Valor | Motivo |
|------|-------|--------|
| `DESIGN_VARIANCE` | 4 | Grid predecible para datos; asimetría solo en señal vs matriz |
| `MOTION_INTENSITY` | 3 | Entradas suaves; respeta `prefers-reduced-motion` |
| `VISUAL_DENSITY` | 7 | Lectura admin densa, sin cockpit de bordes duros |

**Modo redesign:** Overhaul visual de la tab Resumen + chrome; **preservar** IA (Rápido/Comparar), datos y tokens de marca.

---

## Decisiones validadas (brainstorm)

| Tema | Elección |
|------|----------|
| Intensidad | Overhaul visual (no solo polish) |
| Lenguaje | Jerarquía tipo signal board **reinterpretada** en DK soft mono |
| Primer fold | Señal grande + matriz de KPIs |
| Comparar | Misma estructura (base / actual / delta por celda) |
| Alcance código | Resumen + command deck (enfoque 2); resto de tabs sin cambios |

---

## Problema y éxito

El Resumen actual se siente cockpit SaaS genérico (glass, strips, indigo residual en charts) y no aprovecha la identidad monocroma boutique del sistema ni deja la lectura de rendimiento lo bastante inmediata.

**Éxito:**
- En &lt;5s el admin lee: señal → 4 KPIs con deltas → un chart / drivers.
- Color de rendimiento accesible (nunca solo color: flecha + % + texto).
- Se ve **DK** (login/soft-mono + `app-themes`), no un template de analytics.
- Rápido y Comparar comparten un solo lenguaje visual.

---

## Fuera de alcance

- Tabs Ventas / Productos / Categorías / Predicción.
- Endpoints MoM nuevos.
- Dark mode dedicado o temas pastel en esta iteración.
- Refactors masivos fuera de Resumen/chrome.
- Hard-edged “grid Excel”, glass multi-capa, glows, indigo/purple AI.

---

## Identidad visual (anti-genérico)

### Anclar (marca existente)

- Fondo `--app-bg` `#fafafa`; paneles `--app-panel` blanco; bordes `--app-border` / `--app-border-strong`.
- Accent negro `--app-accent` `#000` / CTA pill negro (segmented Rápido|Comparar, periodo).
- Tipografía **DM Sans**; labels 9–10px uppercase `tracking` ancho weight 800; números `font-black` tabular.
- Radios soft: command deck ~24px; señal ~28px; celdas KPI ~20–22px; alineado a paneles `rounded-[2.5rem]` del sistema.
- Sombra `--app-shadow-panel` (difusa, baja).
- Halo `--report-halo` monocromo sutil (ya en reportes).
- Copy retail: “Ritmo del negocio”, “ticket”, meses en español (`Jul 2026`). Sin jerga SaaS vacía (“engagement”, “insights engine”).

### Color de rendimiento (a11y)

| Señal | Uso | Regla |
|-------|-----|--------|
| Al alza | Verde sistema (`--app-metric-icon-1-*` / tonos AA) | Texto + ▲ + fondo chip suave |
| Mixto / estable | Ámbar sistema | Texto + · + “sin cambio claro” |
| En riesgo | Rojo sistema (`--app-metric-icon-5-*`) | Texto + ▼ + fondo chip suave |

El cuerpo de la UI permanece **blanco/gris/negro**. El color semántico no tinte el layout entero (evitar tableros teal/Carbon).

### Prohibido (taste + marca)

- Gradientes indigo/sky en charts del Resumen (`#6366f1` residual).
- Bordes 1px densos tipo spreadsheet a radio 0–4px.
- Tres cards KPI idénticas “feature row” con iconos indigo por defecto.
- Glass pesado / neon glow / Inter / serif editorial / cream-brass.
- Em-dash como floritura tipográfica en UI.
- Score hardcodeado en modo Comparar.

---

## Arquitectura UI

```
ReportesPage (sin cambio de tabs)
  ReportPeriodProvider
  ReportPageActionsProvider
    ReportPageShell
      ReportCommandDeck          ← variante signal / soft-mono (solo tab Resumen)
      ResumenGeneral
        ReportSignalPanel        ← nuevo (reemplaza verdict banner genérico)
        ReportSignalMatrix       ← nuevo (2×2 Rápido | celdas con base en Comparar)
        ReportDriverCards        ← polish soft-mono (Rápido)
        ReportTrendPanel         ← chart monocromo + polish
        ReportCategoryBreakdown  ← polish (Rápido)
        ReportCompareMonthsChart ← Absolutos en tooltip; series negro/gris (Comparar)
```

**Preservar:** contexto de periodo, `reportesCompararMeses`, exports, `?tab=`, lógica VentaService en cliente.

---

## Composición (primer fold)

Desktop:

```
┌─ Command deck soft (sticky) ─────────────────────────┐
│  DK · Resumen · “Ritmo del negocio”                  │
│  [Rápido | Comparar]  [Hoy|7d|30d] o pickers meses   │
└──────────────────────────────────────────────────────┘
┌─ Señal (hero tipográfico) ─┬─ Matriz 2×2 ───────────┐
│  SEÑAL DEL PERIODO         │ Ingresos │ Ventas      │
│  Al alza                   │ Ticket   │ Unidades    │
│  copy 1–2 líneas + chip    │ + delta texto+flecha   │
└────────────────────────────┴────────────────────────┘
┌─ Tendencia ────────────────┬─ Drivers / categorías ─┐
└────────────────────────────┴────────────────────────┘
```

Mobile (`&lt;768`): columna única — deck → señal → matriz (2 cols) → tendencia → drivers.

---

## Modo Comparar

- Misma composición: señal + matriz + chart.
- Señal: “Jul vs Jun” + Al alza / Mixto / En riesgo derivada del delta real (prioridad ingresos; si mixto de métricas → Mixto).
- Cada celda: etiqueta · valor base (faint) · valor actual (black) · delta con flecha/texto.
- Chart agrupado: colores `--report-compare-base` (gris) vs `--report-compare-focus` (negro/accent); **tooltip con valores absolutos** (no solo escala 0–100).
- Validaciones existentes: meses iguales / futuros.

---

## Señal (lógica)

**Rápido:** reutilizar score/insights reales si existen; mapear a Al alza / Mixto / En riesgo con umbrales claros documentados en código (p. ej. score alto / medio / bajo o sesgo de deltas de ingresos+ventas).

**Comparar:** eliminar score hardcodeado (72/48/60). Derivar de deltas calculados.

Siempre acompañar con frase corta en lenguaje de negocio.

---

## Estados

| Estado | UI |
|--------|-----|
| Loading | Skeleton señal + 4 celdas (misma geometría/radios) |
| Vacío | Mensaje “Sin ventas en el periodo” + hint de cambiar periodo |
| Error | Inline en deck + reintentar |
| Reduced motion | Sin shimmer; transiciones opacidad mínimas/instantáneas |

---

## Datos / fixes de verdad (mínimos)

- Fuente: cliente + `VentaService` / `compararMeses` (sin API MoM nueva).
- Matriz: ingresos, ventas (órdenes), ticket, unidades (ya calculados; unidades pasan a UI).
- Filtrar `dayData` al periodo activo (bug actual del rango extendido).
- No depender de `getResumenGeneral` ignorado (dejar de llamarlo o usarlo de verdad; preferencia: **dejar de llamarlo** en esta iteración).

---

## Motion (2–3 intenciones)

1. Entrada fade/slide corto del bloque señal al cargar datos.
2. Transición suave al cambiar periodo / modo (opacity layout).
3. Hover leve en celdas KPI (`translate`/sombra, no glow).

Sin loops infinitos ni micro-physics.

---

## Criterios de aceptación

1. Primer viewport legible: señal + matriz sin scroll en desktop ≥1280.
2. Deltas comprensibles en escala de grises (texto + símbolo).
3. Contraste WCAG AA en chips y tipografía.
4. Rápido y Comparar comparten componentes/layout.
5. Ventas/Productos/Categorías/Predicción sin regresiones visuales.
6. Pre-flight taste aplicable: cero indigo, cero em-dash ornamental, un accent (negro), shape lock soft, theme light coherente con `classic`.
7. Mock visual de referencia: `.superpowers/brainstorm/663-1783983278/content/design-dk-signal-refined.html`.

---

## Archivos previstos

- `front-end/sistemaReact-Main/src/components/reportes/ResumenGeneral.tsx`
- `front-end/sistemaReact-Main/src/components/reportes/layout/ReportCommandDeck.tsx`
- `front-end/sistemaReact-Main/src/components/reportes/layout/ReportSignalPanel.tsx` (nuevo)
- `front-end/sistemaReact-Main/src/components/reportes/layout/ReportSignalMatrix.tsx` (nuevo)
- `front-end/sistemaReact-Main/src/styles/reports-analytics.css`
- Utilidades señal / fix dayData según inspección al implementar
- Tests existentes de `reportesCompararMeses` + ajustes si la señal exporta helpers

---

## Relación con spec previo

Extiende y supersede visualmente la parte Resumen de  
`docs/superpowers/specs/2026-07-13-reportes-resumen-comparativa-meses-design.md`  
para el **chrome + presentación**. La lógica de periodo/comparar permanece.
