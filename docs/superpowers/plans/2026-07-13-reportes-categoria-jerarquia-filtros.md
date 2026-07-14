# Reportes Categorías — Jerarquía y filtros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compactar la barra de filtros del tab Categorías al estilo Productos y unificar la jerarquía visual (KPIs con período + cabecera de nivel sin título duplicado).

**Architecture:** Cambios localizados en `ReportePorCategoria.tsx` reutilizando clases CSS `product-report-controls*`. Añadir un modificador de grid `--dates-only` para 2 fechas + Limpiar (sin columna de categoría). No se tocan gráficos ni APIs.

**Tech Stack:** React 18, Tailwind utilities existentes, `reports-analytics.css`, `DatePickerPopover`, `DashboardMetricCard`, `SectionHeader`.

**Spec:** `docs/superpowers/specs/2026-07-13-reportes-categoria-jerarquia-filtros-design.md`

---

## File map

| File | Role |
|------|------|
| `front-end/sistemaReact-Main/src/styles/reports-analytics.css` | Modificador grid `--dates-only` |
| `front-end/sistemaReact-Main/src/components/reportes/ReportePorCategoria.tsx` | UI filtros + KPIs `sub` + cabecera unificada |

---

### Task 1: Grid CSS dates-only

**Files:**
- Modify: `front-end/sistemaReact-Main/src/styles/reports-analytics.css` (después de `.product-report-controls__grid` media queries ~1641–1658)

- [ ] **Step 1: Añadir modificador**

Insertar después del bloque `@media (min-width: 1100px)` de `__grid`:

```css
/* Categorías: solo fechas + Limpiar (sin columna categoría) */
.product-report-controls__grid--dates-only {
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .product-report-controls__grid--dates-only {
    grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  }
}

@media (min-width: 1100px) {
  .product-report-controls__grid--dates-only {
    grid-template-columns: 1fr 1fr auto;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add front-end/sistemaReact-Main/src/styles/reports-analytics.css
git commit -m "style: grid dates-only para filtros de Categorías"
```

---

### Task 2: Barra de filtros + KPIs + cabecera en ReportePorCategoria

**Files:**
- Modify: `front-end/sistemaReact-Main/src/components/reportes/ReportePorCategoria.tsx`

- [ ] **Step 1: Helpers de título y período**

Dentro del componente (antes del `return` principal), añadir:

```tsx
const formatearFechaCorta = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const etiquetaPeriodo = `${formatearFechaCorta(fechaInicio)} – ${formatearFechaCorta(fechaFin)}`;

const tituloNivel =
  breadcrumbs[breadcrumbs.length - 1]?.nombre ?? 'Categorías principales';

const ayudaNivel =
  nivelActual === 'padre'
    ? 'Clic en una barra del gráfico para profundizar'
    : nivelActual === 'subcategoria'
      ? 'Subcategorías — clic en una barra para profundizar'
      : 'Segunda subcategoría';
```

- [ ] **Step 2: Reemplazar panel de filtros**

Sustituir el bloque `DashboardPanel` de “Filtros de Búsqueda” (aprox. líneas 333–389) por:

```tsx
<section className="product-report-controls" aria-label="Filtros de categorías">
  <div className="product-report-controls__grid product-report-controls__grid--dates-only">
    <DatePickerPopover
      label="Fecha inicio"
      value={fechaInicio}
      onChange={setFechaInicio}
    />
    <DatePickerPopover
      label="Fecha fin"
      value={fechaFin}
      onChange={setFechaFin}
      min={fechaInicio}
    />
    <div className="product-report-controls__clear-wrap">
      <label className="product-report-controls__label product-report-controls__label--ghost">_</label>
      <button
        type="button"
        className="product-report-controls__clear"
        onClick={(e) => {
          e.stopPropagation();
          limpiarFiltros();
        }}
      >
        Limpiar
      </button>
    </div>
  </div>

  <div className="product-report-controls__chips">
    <span className="product-report-controls__label">Rápido</span>
    <button type="button" className="product-report-chip" onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('hoy'); }}>
      Hoy
    </button>
    <button type="button" className="product-report-chip" onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('semana'); }}>
      Últimos 7 días
    </button>
    <button type="button" className="product-report-chip" onClick={(e) => { e.stopPropagation(); aplicarFiltroRapido('mes'); }}>
      Últimos 30 días
    </button>
  </div>
</section>
```

- [ ] **Step 3: KPIs con `sub` del período**

En las tres `DashboardMetricCard`, añadir `sub={etiquetaPeriodo}`.

- [ ] **Step 4: Cabecera unificada (reemplazar panel breadcrumb)**

Sustituir el `DashboardPanel` del breadcrumb (aprox. 412–439) por:

```tsx
<div className="min-w-0">
  <nav className="flex flex-wrap mb-2" aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-1">
      {breadcrumbs.map((breadcrumb, index) => (
        <li key={`${breadcrumb.nivel}-${breadcrumb.id || 'root'}`} className="flex items-center">
          {index > 0 && <span className="app-text-faint mx-1">/</span>}
          <button
            type="button"
            onClick={() => navegarAtras(index)}
            className={`text-xs font-bold uppercase tracking-wide transition-colors ${
              index === breadcrumbs.length - 1
                ? 'app-heading cursor-default'
                : 'text-[var(--app-accent)] hover:underline'
            }`}
            disabled={index === breadcrumbs.length - 1}
          >
            {breadcrumb.nombre}
          </button>
        </li>
      ))}
    </ol>
  </nav>
  <SectionHeader title={tituloNivel} subtitle={ayudaNivel} className="mb-0" />
</div>
```

Nota: si el último crumb y `tituloNivel` son el mismo texto, el breadcrumb del nivel actual puede omitirse del título visual — la spec pide un solo título líder; `SectionHeader` usa `tituloNivel` (nombre del crumb actual) y el breadcrumb completo para navegación. Aceptable: crumb último en estado disabled + `SectionHeader` con el mismo nombre (hierarchy: SectionHeader es el display principal en tamaño `text-base/lg`, crumb es `text-xs`).

- [ ] **Step 5: Verificación rápida**

Confirmar en archivo:
- No queda `app-btn-primary` en Limpiar.
- No queda título “Filtros de Búsqueda”.
- No queda helper duplicado idéntico al título sin acción de ayuda distinta.

- [ ] **Step 6: Commit**

```bash
git add front-end/sistemaReact-Main/src/components/reportes/ReportePorCategoria.tsx
git commit -m "feat: jerarquía y filtros compactos en reporte Categorías"
```

---

### Task 3: Verificación visual / regresiones

- [ ] **Step 1:** Abrir tab Categorías en reportes — filtros compactos, Limpiar ghost, chips en fila.
- [ ] **Step 2:** Cambiar Hoy / 7d / 30d y Limpiar — datos/período se actualizan.
- [ ] **Step 3:** Drill-down breadcrumb adelante/atrás sigue funcionando.
- [ ] **Step 4:** Tab Productos sin cambio visual en su barra (grid 4 columnas intacto).

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Barra estilo Productos sin Ranking/Individual | Task 2 Step 2 |
| Limpiar ghost | Task 2 Step 2 |
| Chips Rápido | Task 2 Step 2 |
| KPI `sub` período | Task 2 Step 3 |
| Cabecera unificada sin título duplicado vacío | Task 2 Step 4 |
| Grid sin hueco de categoría | Task 1 |
| Charts/export intactos | sin tocar |
| Productos intacto | modificador scoped `--dates-only` |
