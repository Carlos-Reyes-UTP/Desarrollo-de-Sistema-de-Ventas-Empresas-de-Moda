# Diseño: Reportes — Resumen intuitivo con comparativa libre de meses

**Fecha:** 2026-07-13  
**Estado:** Aprobado en brainstorming (pendiente revisión del usuario del documento)  
**Alcance:** Solo módulo Reportes, tab Resumen (+ chrome del command deck).  
**Enfoque:** Extensión frontend del período/contexto; cálculo en cliente con `VentaService` (sin endpoints MoM nuevos).

---

## 1. Problema y objetivo

El administrador necesita entender el negocio **fácil, rápido y accesible**. Hoy el Resumen tiene KPIs con deltas vs “período anterior” (Hoy/7d/30d), pero no permite **elegir dos meses libres** ni deja la jerarquía de controles lo bastante obvia para un uso ejecutivo diario.

**Éxito:**
- En menos de 5 segundos el admin entiende “cómo vamos” en Resumen.
- Puede cambiar a **Comparar meses**, elegir mes base y mes a comparar, ver KPIs + un chart agrupado.
- No se rompen Ventas, Productos, Categorías, Predicción, exports existentes ni el design system (cards, tipografía, tokens).

---

## 2. Fuera de alcance

- Dashboard admin (`/dashboard/admin`) y otros roles.
- Comparativa mes a mes en Ventas / Productos / Categorías / Predicción.
- Nuevos endpoints backend MoM.
- Refactor de archivos grandes (p. ej. PrediccionVentas) o limpieza masiva de código muerto.
- Chart día-a-día superpuesto de dos meses.
- Donut/mix de categorías en modo Comparar (esta iteración).

---

## 3. Arquitectura

```
ReportesPage
  ReportPeriodProvider          ← ampliado: modo + meses
  ReportPageActionsProvider
    ReportPageShell
      ReportCommandDeck         ← toggle Rápido | Comparar + controles
      ResumenGeneral            ← polish + rama comparar (KPIs + chart)
```

**Preservar:** `.reports-analytics`, `DashboardPanel`, `DashboardMetricCard`, `ReportMetricStrip` (adaptado), `reportChartTheme`, tabs y `?tab=` URL, export Excel (etiquetas actualizadas).

**No tocar lógica local de período** de las otras tabs.

---

## 4. Modelo de período (contexto)

Ampliar `useReportPeriod` / `ReportPeriodContext`:

| Campo | Valores | Notas |
|--------|---------|--------|
| `modo` | `'rapido' \| 'comparar'` | Default: último guardado o `'rapido'` |
| `periodo` | `'hoy' \| '7d' \| '30d'` | Solo aplica en modo `rapido` |
| `mesBase` | `{ year, month }` (1–12) | Modo `comparar`; etiqueta UI: **Mes base** |
| `mesComparar` | `{ year, month }` | Modo `comparar`; etiqueta UI: **Comparar con** |

**Defaults en Comparar:** mes calendario actual (`mesComparar`) vs mes anterior (`mesBase`).

**Persistencia:** `sessionStorage` con keys propias de reportes (`reportes-modo`, `reportes-mes-base`, `reportes-mes-comparar`). En modo rápido se mantiene el comportamiento actual de `reportes-periodo` (y el side-effect hacia `dashboard-admin-periodo` solo para Hoy/7d/30d).

**Regla de delta:** `delta = (métrica_comparar − métrica_base) / métrica_base`. Misma regla de borde que hoy: base 0 y comparar > 0 → +100%; ambos 0 → 0% / “Sin datos”.

**Validaciones:**
- `mesBase !== mesComparar` (avisar; no calcular / deshabilitar apply implícito).
- Ningún mes futuro (máximo = mes actual).

---

## 5. UI / UX (intuitivo para admin)

### Principios
1. Una pregunta a la vez: controles → KPIs → un chart → un insight.
2. Lenguaje de negocio: “Rápido”, “Comparar meses”, “Mes base”, “Comparar con”; meses en español (`Jun 2026`).
3. Números primero; deltas con color + texto (no solo color).
4. Defaults sensatos: entrar y ya hay datos útiles.
5. Command deck sticky: el control de modo no se pierde al scrollear.
6. Estados honestos: carga, vacío (“No hay ventas en este mes”), error.

### Command deck (visible modo solo en tab Resumen)
- Toggle: **Rápido** | **Comparar meses**.
- Rápido: chips Hoy / 7d / 30d (existentes).
- Comparar: dos selectores mes-año etiquetados.
- Slot Export sin cambios de patrón; contenido del Excel refleja modo y meses.

### Resumen — modo Rápido
- Estructura actual (metric strip, tendencia, mix categorías, drivers/insights).
- Polish de copy: deltas claros (`+12% vs período anterior`), jerarquía de título/subtítulo del deck más legible.
- Sin cambiar forma de cards ni tipografía del sistema.

### Resumen — modo Comparar
- **Mostrar:** `ReportMetricStrip` (valores base + comparar + %) + un `DashboardPanel` con barras agrupadas (ingresos, #ventas, ticket) × 2 series + `ReportInsightBanner` con 1 frase (ej. “Ingresos +18% al comparar jul vs jun”).
- **No mostrar en esta iteración:** trend diario, donut de mix categorías.
- Colores del chart vía `reportChartTheme` / `--app-chart-*`.

### Navegación
- Otras tabs siguen a 1 clic en el segmented control.
- No añadir CTAs extra a otras tabs en esta iteración (evitar ruido).

---

## 6. Datos y componentes

**Fuente:** `VentaService.obtenerTodasVentas` (patrón actual de Resumen). Filtrar en cliente por rangos de mes calendario.

**Helpers nuevos (sugeridos):**
- `rangoMesCalendario(year, month)` → `{ inicio, fin }`
- `metricasMes(ventas, rango)` → ingresos, órdenes, ticket, clientes
- `compararMeses(ventas, mesBase, mesComparar)` → métricas A/B, deltas, serie chart

**UI nueva mínima:**
- Subcomponente de pickers / toggle en o junto a `ReportCommandDeck` (p. ej. `ReportCompareMonthPickers`).
- Chart comparativo en Resumen o panel pequeño dedicado; Recharts `BarChart` (sin librería nueva).

**CSS:** extensiones puntuales en `reports-analytics.css` para toggle de modo y pickers; no romper clases existentes.

**Export:** mismos mecanismos; metadatos/hojas indican modo y meses seleccionados.

---

## 7. Errores y edge cases

| Caso | Comportamiento |
|------|----------------|
| Misma mes base y comparar | Bloquear cálculo; aviso corto |
| Mes sin ventas | KPIs 0; mensaje vacío legible |
| Fallo de carga | Error / AlertModal existente; shell intacto |
| Mes futuro | No seleccionable |

---

## 8. Pruebas

- Unitarias de helpers: rangos, deltas (0/0, 0/>0, normal), serie del chart.
- Smoke manual: Rápido ↔ Comparar; export; tabs hermanas sin regresión visual/funcional.

---

## 9. Criterios de aceptación

1. En Resumen, el admin puede usar **Rápido** (Hoy/7d/30d) como hoy, con copy más claro.
2. Puede activar **Comparar meses**, elegir dos meses distintos (no futuros) y ver KPIs + un chart agrupado + un insight.
3. Etiquetas “Mes base” / “Comparar con” y deltas `(comparar − base) / base` son consistentes.
4. Ventas, Productos, Categorías y Predicción no cambian de comportamiento.
5. Se respetan tokens, cards y tipografía del módulo `.reports-analytics`.
6. Export Excel del Resumen sigue funcionando y refleja el período/modo activo.

---

## 10. Archivos principales a tocar

- `front-end/sistemaReact-Main/src/components/reportes/hooks/useReportPeriod.ts`
- `front-end/sistemaReact-Main/src/components/reportes/context/ReportPeriodContext.tsx`
- `front-end/sistemaReact-Main/src/components/reportes/layout/ReportCommandDeck.tsx`
- `front-end/sistemaReact-Main/src/components/reportes/ResumenGeneral.tsx`
- `front-end/sistemaReact-Main/src/components/reportes/layout/ReportMetricStrip.tsx` (si hace falta mostrar dual values)
- `front-end/sistemaReact-Main/src/styles/reports-analytics.css`
- Utils nuevos bajo `src/utils/` (comparativa de meses) + tests unitarios asociados

---

## 11. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Superficie | Solo Reportes / Resumen |
| Comparativa | Selector libre mes vs mes |
| Controles de período | Dos modos: Rápido + Comparar meses |
| Contenido Comparar | KPIs + un chart de barras agrupadas |
| Polish | Resumen + command deck; no lavado de las 5 tabs |
| Implementación | Frontend-only, enfoque 1 |
| Convención meses | Base = denominador; Comparar = numerador del delta |
