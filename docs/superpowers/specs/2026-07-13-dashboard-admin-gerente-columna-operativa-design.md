# Diseño: Dashboard Admin / Gerente — columna operativa con comparación mes anterior

**Fecha:** 2026-07-13  
**Estado:** Aprobado (pendiente implementación)  
**Alcance:** Homes `/dashboard/admin` y `/dashboard/gerente`  
**Enfoque de layout:** Columna operativa (principal ~2/3 + sidebar ~1/3)  
**Redesign:** Mejorar jerarquía visual y accesibilidad sin romper el design system (`--app-*`, Tailwind, componentes dashboard existentes)

---

## 1. Problema y objetivo

Los homes de admin y gerente muestran KPIs con selector Hoy/7d/30d y bloques distintos por rol. Falta un tablero inicial unificado orientado a decisión:

- Ritmo de ventas del mes
- Variantes más y menos vendidas
- Últimas 10 ventas
- Comparación **únicamente** con el mes calendario anterior

**Éxito:**
- En el primer viewport se entiende “cómo va el mes” sin ruido de períodos rolling.
- Admin y gerente comparten la misma jerarquía base; solo cambia un bloque de rol.
- Toggle `Mes actual | vs mes anterior` es el único control de período del home.
- Contraste, tipografía tabular y focus rings cumplen lectura ejecutiva / WCAG AA sobre tokens del tema.

---

## 2. Decisiones acordadas

| Tema | Decisión |
|------|----------|
| Alcance por rol | Misma base + un bloque propio (Admin: actividad; Gerente: personal/estructura) |
| Control de período | Toggle **Mes actual \| vs mes anterior** (sin Hoy/7d/30d) |
| Ranking | Variantes (producto + color + talla), top 5 y bottom 5 |
| Layout | Columna operativa (ritmo + últimas 10 a la izquierda; rankings + rol a la derecha) |
| Comparación | Solo mes calendario anterior; no meses libres ni años |

---

## 3. Fuera de alcance

- Rediseño de Reportes, Predicción o dashboard almacenero
- Comparar meses arbitrarios / multi-mes / YoY
- Nuevos endpoints backend salvo que bottom-N no se pueda resolver reutilizando reportes/ventas existentes (preferir reutilizar)
- Ampliar CTAs o inventar módulos nuevos en el bloque de rol
- Migrar framework o sistema de estilos

---

## 4. Arquitectura de UI

```
DashboardAdminPage / DashboardGerentePage
  PageHeader (variant dashboard)
  DashboardMonthToggle          ← Mes actual | vs mes anterior
  DashboardKpiStrip             ← 4 métricas (+ deltas si compare ON)
  grid 2/3 | 1/3
    left:
      DashboardSalesPaceChart   ← ritmo día-a-día
      DashboardRecentSalesTable ← últimas 10 (compartida)
    right:
      DashboardVariantRankPanel ← más / menos vendidas
      RoleBlock                 ← Admin: actividad | Gerente: personal
```

**Preservar / reutilizar:**
- `DashboardMetricCard`, `DashboardPanel`, `PageHeader`
- Tokens `app-themes.css` (`--app-metric-*`, `--app-chart-gradient-*`)
- Utilidades de comparación de meses ya usadas en Reportes (`reportesCompararMeses`, métricas MoM) donde quepan
- `VentaService.obtenerTodasVentas` / `GET /api/cajero/ventas`
- Endpoints de variantes más vendidas en `/api/admin/reportes` (o ranking en cliente desde ventas detalladas)

**Extraer componente compartido** (recomendado): un hook o layout `useDashboardVentasMes` / `DashboardVentasHome` usado por ambas páginas para evitar divergencia admin/gerente.

---

## 5. Modelo de período

| Modo toggle | Ventana primaria | Comparación |
|-------------|------------------|-------------|
| `Mes actual` (default) | Día 1 del mes corriente → hoy | Ninguna (sin % ni segunda serie) |
| `vs mes anterior` | Misma ventana primaria | Mes calendario anterior completo (1 → último día) |

**Ritmo con compare ON:** serie del mes actual + serie atenuada del mes anterior alineada por día del mes (día 1 vs día 1, etc.). Días futuros del mes actual no se inventan; la serie corta en “hoy”.

**Últimas 10 ventas:** siempre las 10 más recientes globales; **no** dependen del toggle.

**Rankings:** siempre calculados sobre el mes actual (1 → hoy). Con compare ON, opcional mostrar “vs N uds. mes ant.” solo en las primeras filas del top (no obligatorio en v1 si complica; el gráfico y KPIs llevan la comparación).

---

## 6. Contenido por bloque

### 6.1 KPIs (4)
- Ventas totales
- Unidades vendidas
- Ticket promedio
- Clientes activos (mismo criterio que el home actual)

Con compare ON: valor actual + delta % vs mes anterior (subida/bajada con color desaturado del tema).

### 6.2 Ritmo de ventas
- Chart Recharts (barras o área) por día
- Una serie OFF; dos series ON
- Empty: “Sin ventas en este mes”

### 6.3 Variantes más / menos vendidas
- Top 5 y bottom 5 por unidades
- Label: producto · color · talla + unidades
- Empty: mensaje claro si no hay movimiento

### 6.4 Últimas 10 ventas
- Columnas: hora, detalle (boleta/ítems), método de pago, monto
- `tabular-nums` en montos y horas
- Compartida admin/gerente

### 6.5 Bloque de rol
- **Admin:** actividad reciente (reutilizar `dashboardActividad` / feed actual; recortar ruido)
- **Gerente:** composición de personal / CTAs de estructura actuales (sin ampliar alcance)

---

## 7. Accesibilidad visual y jerarquía (redesign)

1. Título de página como señal principal; toggle a la derecha, un solo control (no cluster de pills Hoy/7d/30d).
2. KPIs: label pequeño uppercase/tracking → número grande tabular → delta solo si compare ON.
3. El gráfico lleva el peso del primer fold; sidebar no iguala altura tipográfica del título del chart.
4. Rankings con encabezados “Más vendidas” / “Menos vendidas” claros; evitar tres cards idénticas genéricas.
5. Focus ring visible en toggle, botones y filas interactivas.
6. Contraste texto/superficie ≥ AA con tokens `--app-*` (light y temas existentes).
7. Sombras tintadas / bordes del sistema; sin gradientes “AI purple”.
8. Loading: skeletons con forma de strip/chart/listas/tabla.
9. Error: banner inline con reintentar; sin `window.alert()`.

---

## 8. Flujo de datos

```
mount / toggle change
  → fetch ventas mesActual (1→hoy)
  → si compare ON: fetch ventas mesAnterior (mes completo)
  → derivar KPIs, serie ritmo, top/bottom variantes
  → fetch/slice últimas 10 ventas (independiente del toggle)
  → bloque rol: fuentes actuales por página
```

Preferir cálculo en cliente reutilizando patrones de Reportes. Si el ranking de variantes ya existe vía `ReporteService`, usarlo con rango de fechas del mes actual.

---

## 9. Estados y errores

| Estado | Comportamiento |
|--------|----------------|
| Loading | Skeletons alineados al layout |
| Vacío mes | Mensajes por bloque; KPIs en cero |
| Error red | Banner + reintentar; resto no crashea |
| Compare sin datos mes ant. | Deltas “—” o “sin base”; no inventar % |

---

## 10. Criterios de aceptación

- [ ] Admin y gerente muestran ritmo, top/bottom 5 variantes, últimas 10 ventas
- [ ] No existe selector Hoy/7d/30d en estos homes
- [ ] Toggle Mes actual | vs mes anterior funciona; deltas y serie sombra solo en compare ON
- [ ] Últimas 10 no cambian al toglear comparación
- [ ] Bloque de rol distinto y limitado (actividad vs personal)
- [ ] Skeletons, vacío y error cubiertos
- [ ] Focus rings y números tabulares presentes
- [ ] Reportes y demás dashboards sin regresiones funcionales

---

## 11. Notas de implementación

- Extraer layout/hook compartido para no duplicar lógica entre `DashboardAdminPage` y `DashboardGerentePage`.
- Reutilizar CSS/tokens existentes; estilos nuevos mínimos y locales al dashboard home si hace falta.
- Verificar mobile: stack columna (KPIs → ritmo → rankings → últimas 10 → rol).
