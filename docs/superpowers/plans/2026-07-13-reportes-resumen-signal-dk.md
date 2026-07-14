# Resumen Signal × DK soft mono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la tab Resumen (+ chrome del command deck) con jerarquía señal + matriz 2×2, estética DK soft-mono (no SaaS genérico), deltas accesibles y Comparar con la misma estructura.

**Architecture:** Extraer lógica de tono de señal (`reportSignal.ts`) testeable; nuevos leaf components `ReportSignalPanel` + `ReportSignalMatrix`; wire en `ResumenGeneral`; variante CSS soft-mono en `reports-analytics.css` + command deck solo cuando `tabActiva === 'resumen'`. Sin backend nuevo. Commits solo si el usuario lo pide.

**Tech Stack:** React 19, Vite, Tailwind v4, tokens `--app-*`, Vitest, Recharts, Material Symbols.

**Spec:** [docs/superpowers/specs/2026-07-13-reportes-resumen-signal-dk-design.md](../specs/2026-07-13-reportes-resumen-signal-dk-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| Create `src/utils/reportSignal.ts` | Tone Al alza / Mixto / En riesgo; map score + deltas Comparar |
| Create `src/utils/reportSignal.test.ts` | Unit tests |
| Create `src/components/reportes/layout/ReportSignalPanel.tsx` | Hero tipográfico de señal |
| Create `src/components/reportes/layout/ReportSignalMatrix.tsx` | Matriz 2×2 Rápido y Comparar |
| Modify `src/styles/reports-analytics.css` | Tokens/clases signal soft-mono |
| Modify `src/components/reportes/layout/ReportCommandDeck.tsx` | Copy + pills DK en Resumen |
| Modify `src/components/reportes/ResumenGeneral.tsx` | Wire UI, fix dayData, quitar `getResumenGeneral`, señal Comparar real |
| Modify `src/components/reportes/layout/reportChartTheme.tsx` | Gradiente Resumen monocromo (accent/negro → faint) |
| Optional polish | `ReportTrendPanel` / `ReportDriverCards` solo clases CSS nuevas |

**Do not modify:** otras tabs de Reportes, backend, login.

---

### Task 1: Helpers de señal (TDD)

**Files:**
- Create: `front-end/sistemaReact-Main/src/utils/reportSignal.ts`
- Create: `front-end/sistemaReact-Main/src/utils/reportSignal.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/reportSignal.test.ts
import { describe, expect, it } from 'vitest';
import {
  mapScoreToSignalTone,
  signalLabel,
  buildSignalFromScore,
  buildSignalFromCompareDeltas,
} from './reportSignal';

describe('mapScoreToSignalTone', () => {
  it('maps high score to up', () => {
    expect(mapScoreToSignalTone(75)).toBe('up');
    expect(mapScoreToSignalTone(90)).toBe('up');
  });
  it('maps low score to down', () => {
    expect(mapScoreToSignalTone(44)).toBe('down');
    expect(mapScoreToSignalTone(0)).toBe('down');
  });
  it('maps mid score to mixed', () => {
    expect(mapScoreToSignalTone(45)).toBe('mixed');
    expect(mapScoreToSignalTone(74)).toBe('mixed');
  });
});

describe('signalLabel', () => {
  it('returns Spanish labels', () => {
    expect(signalLabel('up')).toBe('Al alza');
    expect(signalLabel('mixed')).toBe('Mixto');
    expect(signalLabel('down')).toBe('En riesgo');
  });
});

describe('buildSignalFromCompareDeltas', () => {
  it('up when ingresos and ventas positive', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 12,
      crecimientoOrdenes: 8,
      crecimientoTicket: -3,
      etiquetaBase: 'Jun 2026',
      etiquetaComparar: 'Jul 2026',
    });
    expect(s.tone).toBe('up');
    expect(s.label).toBe('Al alza');
    expect(s.summary.toLowerCase()).toContain('jun');
  });
  it('down when ingresos and ventas negative', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: -10,
      crecimientoOrdenes: -5,
      crecimientoTicket: 2,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('down');
  });
  it('mixed when signs disagree', () => {
    const s = buildSignalFromCompareDeltas({
      crecimientoVentas: 10,
      crecimientoOrdenes: -8,
      crecimientoTicket: 0,
      etiquetaBase: 'May 2026',
      etiquetaComparar: 'Jun 2026',
    });
    expect(s.tone).toBe('mixed');
  });
});

describe('buildSignalFromScore', () => {
  it('keeps retail copy and lead delta', () => {
    const s = buildSignalFromScore({
      score: 80,
      headline: 'Salud comercial sólida',
      summary: 'Vas mejor que el período anterior.',
      leadDeltaPct: 12.4,
      leadDeltaLabel: 'Ingresos',
    });
    expect(s.tone).toBe('up');
    expect(s.label).toBe('Al alza');
    expect(s.leadDelta?.pct).toBe(12.4);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd front-end/sistemaReact-Main && npm test -- src/utils/reportSignal.test.ts
```

Expected: FAIL module not found / export missing.

- [ ] **Step 3: Implement helpers**

```ts
// src/utils/reportSignal.ts
export type ReportSignalTone = 'up' | 'mixed' | 'down';

export interface ReportSignalView {
  tone: ReportSignalTone;
  label: string;
  /** Título corto bajo el label (opcional; puede repetir label) */
  headline: string;
  summary: string;
  leadDelta?: { label: string; pct: number };
  /** Contexto para eyebrow, p. ej. "Jul vs Jun" */
  contextLabel?: string;
}

export function mapScoreToSignalTone(score: number): ReportSignalTone {
  if (score >= 75) return 'up';
  if (score < 45) return 'down';
  return 'mixed';
}

export function signalLabel(tone: ReportSignalTone): string {
  if (tone === 'up') return 'Al alza';
  if (tone === 'down') return 'En riesgo';
  return 'Mixto';
}

export function buildSignalFromScore(input: {
  score: number;
  headline: string;
  summary: string;
  leadDeltaPct?: number;
  leadDeltaLabel?: string;
}): ReportSignalView {
  const tone = mapScoreToSignalTone(input.score);
  return {
    tone,
    label: signalLabel(tone),
    headline: input.headline,
    summary: input.summary,
    leadDelta:
      input.leadDeltaPct !== undefined && input.leadDeltaLabel
        ? { label: input.leadDeltaLabel, pct: input.leadDeltaPct }
        : undefined,
  };
}

export function buildSignalFromCompareDeltas(input: {
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoTicket: number;
  etiquetaBase: string;
  etiquetaComparar: string;
}): ReportSignalView {
  const v = input.crecimientoVentas;
  const o = input.crecimientoOrdenes;
  let tone: ReportSignalTone = 'mixed';
  if (v > 0 && o >= 0) tone = 'up';
  else if (v < 0 && o <= 0) tone = 'down';
  else if (v > 0 && o < 0) tone = 'mixed';
  else if (v < 0 && o > 0) tone = 'mixed';
  else if (v === 0 && o === 0) tone = 'mixed';
  else if (v > 0) tone = 'up';
  else if (v < 0) tone = 'down';

  const label = signalLabel(tone);
  const contextLabel = `${input.etiquetaComparar} vs ${input.etiquetaBase}`;
  const summaryParts = [
    `Ingresos ${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    `ventas ${o >= 0 ? '+' : ''}${o.toFixed(1)}%`,
    `ticket ${input.crecimientoTicket >= 0 ? '+' : ''}${input.crecimientoTicket.toFixed(1)}%`,
  ];
  return {
    tone,
    label,
    headline: label,
    summary: `${contextLabel}. ${summaryParts.join(', ')}.`,
    contextLabel,
    leadDelta: { label: 'Ingresos', pct: v },
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd front-end/sistemaReact-Main && npm test -- src/utils/reportSignal.test.ts
```

Expected: all PASS.

---

### Task 2: CSS signal soft-mono

**Files:**
- Modify: `front-end/sistemaReact-Main/src/styles/reports-analytics.css`

- [ ] **Step 1: Append signal tokens and layout (dopo blocos existentes de verdict/metric)**

Añadir al final (o tras `.report-verdict`) clases nuevas — **no** reutilizar bordes tipo spreadsheet:

```css
/* Signal hierarchy × DK soft mono */
.reports-analytics--signal .reports-analytics__command-deck {
  border-radius: 1.5rem;
  background: var(--app-panel);
  backdrop-filter: none;
  box-shadow: var(--app-shadow-panel);
  border: 1px solid var(--app-border);
}

.reports-analytics--signal .report-period-switch {
  background: var(--app-metric-bg);
  border-radius: 999px;
  padding: 3px;
  border: none;
}

.reports-analytics--signal .report-period-switch__btn--active {
  background: var(--app-accent);
  color: var(--app-accent-fg);
  border-radius: 999px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}

.report-signal-fold {
  display: grid;
  grid-template-columns: minmax(220px, 1.05fr) minmax(280px, 1.55fr);
  gap: 0.75rem;
}

@media (max-width: 767px) {
  .report-signal-fold {
    grid-template-columns: 1fr;
  }
}

.report-signal-panel {
  position: relative;
  overflow: hidden;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 1.75rem;
  padding: 1.25rem 1.35rem;
  box-shadow: var(--app-shadow-panel);
}

.report-signal-panel__orb {
  position: absolute;
  width: 11rem;
  height: 11rem;
  right: -2rem;
  bottom: -3rem;
  border-radius: 50%;
  pointer-events: none;
}

.report-signal-panel--up .report-signal-panel__orb {
  background: radial-gradient(circle, color-mix(in srgb, var(--app-metric-icon-1-fg) 18%, transparent), transparent 70%);
}
.report-signal-panel--mixed .report-signal-panel__orb {
  background: radial-gradient(circle, color-mix(in srgb, var(--app-metric-icon-4-fg) 16%, transparent), transparent 70%);
}
.report-signal-panel--down .report-signal-panel__orb {
  background: radial-gradient(circle, color-mix(in srgb, var(--app-metric-icon-5-fg) 16%, transparent), transparent 70%);
}

.report-signal-panel__eyebrow {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-text-faint);
}

.report-signal-panel__label {
  font-size: clamp(1.85rem, 2.5vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.05;
  color: var(--app-text);
  margin: 0.5rem 0 0.4rem;
}

.report-signal-panel__summary {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--app-text-muted);
  max-width: 36ch;
}

.report-signal-matrix {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.report-signal-cell {
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  padding: 0.85rem 1rem;
  box-shadow: var(--app-shadow-panel);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}

@media (prefers-reduced-motion: no-preference) {
  .report-signal-cell:hover {
    transform: translateY(-1px);
  }
}

.report-signal-cell__label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-text-faint);
}

.report-signal-cell__base {
  font-size: 0.7rem;
  color: var(--app-text-faint);
  margin-top: 0.15rem;
}

.report-signal-cell__value {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--app-metric-text);
  margin: 0.25rem 0;
}

.report-signal-cell__delta {
  font-size: 0.7rem;
  font-weight: 700;
}
.report-signal-cell__delta--up { color: var(--report-delta-up-fg); }
.report-signal-cell__delta--down { color: var(--report-delta-down-fg); }
.report-signal-cell__delta--flat { color: var(--app-text-muted); }

.report-signal-skeleton {
  border-radius: 1.75rem;
  background: var(--app-metric-bg);
  min-height: 8rem;
}

@media (prefers-reduced-motion: reduce) {
  .report-signal-cell { transition: none; }
}
```

- [ ] **Step 2: Verificación manual rápida**

Confirmar que el archivo no rompe sintaxis CSS (abrir en editor / build posterior).

---

### Task 3: `ReportSignalPanel`

**Files:**
- Create: `front-end/sistemaReact-Main/src/components/reportes/layout/ReportSignalPanel.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { MaterialIcon } from '@/shared/ui';
import type { ReportSignalView } from '@/utils/reportSignal';

interface Props {
  signal: ReportSignalView;
}

export function ReportSignalPanel({ signal }: Props) {
  const delta = signal.leadDelta;
  const up = delta && delta.pct > 0;
  const down = delta && delta.pct < 0;

  return (
    <section
      className={`report-signal-panel report-signal-panel--${signal.tone}`}
      role="status"
      aria-label={`Señal del periodo: ${signal.label}`}
    >
      <div className="report-signal-panel__orb" aria-hidden />
      <p className="report-signal-panel__eyebrow">
        {signal.contextLabel ? `Señal · ${signal.contextLabel}` : 'Señal del periodo'}
      </p>
      <h2 className="report-signal-panel__label">{signal.label}</h2>
      <p className="report-signal-panel__summary">{signal.summary}</p>
      {delta ? (
        <span
          className={`report-delta-chip ${
            up ? 'report-delta-chip--up' : down ? 'report-delta-chip--down' : 'report-delta-chip--flat'
          }`}
          style={{ marginTop: '0.85rem', display: 'inline-flex' }}
        >
          <MaterialIcon
            icon={up ? 'trending_up' : down ? 'trending_down' : 'remove'}
            className="w-3.5 h-3.5"
          />
          {delta.label} {up ? '+' : ''}
          {delta.pct.toFixed(1)}% vs ant.
        </span>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck leaf**

No test de UI obligatorio; el wire en Task 5 valida integración.

---

### Task 4: `ReportSignalMatrix`

**Files:**
- Create: `front-end/sistemaReact-Main/src/components/reportes/layout/ReportSignalMatrix.tsx`

- [ ] **Step 1: Implement shared matrix**

```tsx
import { MaterialIcon } from '@/shared/ui';

const fmtMoneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export type SignalMatrixCell = {
  id: string;
  label: string;
  value: number;
  deltaPct: number;
  format: 'moneda' | 'entero';
  /** Solo Comparar */
  baseValue?: number;
  baseLabel?: string;
};

interface Props {
  cells: SignalMatrixCell[];
  deltaVsLabel?: string;
}

function DeltaText({ pct, vs }: { pct: number; vs: string }) {
  if (pct === 0) {
    return <span className="report-signal-cell__delta report-signal-cell__delta--flat">· 0% vs {vs}</span>;
  }
  const up = pct > 0;
  return (
    <span
      className={`report-signal-cell__delta ${
        up ? 'report-signal-cell__delta--up' : 'report-signal-cell__delta--down'
      }`}
    >
      <MaterialIcon
        icon={up ? 'trending_up' : 'trending_down'}
        className="w-3.5 h-3.5"
        style={{ verticalAlign: 'middle', marginRight: 2 }}
      />
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {pct.toFixed(1)}% vs {vs}
    </span>
  );
}

export function ReportSignalMatrix({ cells, deltaVsLabel = 'ant.' }: Props) {
  const fmt = (c: SignalMatrixCell) =>
    c.format === 'moneda' ? fmtMoneda.format(c.value) : c.value.toLocaleString('es-PE');

  return (
    <section className="report-signal-matrix" aria-label="Métricas del periodo">
      {cells.map((c) => (
        <article key={c.id} className="report-signal-cell">
          <p className="report-signal-cell__label">{c.label}</p>
          {c.baseValue !== undefined && c.baseLabel ? (
            <p className="report-signal-cell__base">
              Base {c.baseLabel}:{' '}
              {c.format === 'moneda'
                ? fmtMoneda.format(c.baseValue)
                : c.baseValue.toLocaleString('es-PE')}
            </p>
          ) : null}
          <p className="report-signal-cell__value">{fmt(c)}</p>
          <DeltaText pct={c.deltaPct} vs={deltaVsLabel} />
        </article>
      ))}
    </section>
  );
}
```

---

### Task 5: Wire `ResumenGeneral`

**Files:**
- Modify: `front-end/sistemaReact-Main/src/components/reportes/ResumenGeneral.tsx`

- [ ] **Step 1: Imports — replace verdict/strips with signal components**

Quitar usos de `ReportVerdictBanner`, `ReportMetricStrip`, `ReportCompareMetricStrip` en el JSX de éxito. Importar:

```ts
import { ReportSignalPanel } from '@/components/reportes/layout/ReportSignalPanel';
import { ReportSignalMatrix } from '@/components/reportes/layout/ReportSignalMatrix';
import { buildSignalFromCompareDeltas, buildSignalFromScore } from '@/utils/reportSignal';
import { filtrarVentasPorPeriodo } from '@/utils/dashboardPeriodo'; // ya parcial
```

- [ ] **Step 2: Fix `dayData` al periodo activo**

Reemplazar:

```ts
const dayData = useMemo(() => {
  if (modo === 'comparar') return buildDayData([]);
  return buildDayData(allVentas);
}, [allVentas, modo]);
```

por:

```ts
const dayData = useMemo(() => {
  if (modo === 'comparar') return buildDayData([]);
  const delPeriodo = filtrarVentasPorPeriodo(allVentas, periodo);
  return buildDayData(delPeriodo);
}, [allVentas, modo, periodo]);
```

- [ ] **Step 3: Remove dead `getResumenGeneral` call**

En `cargarDatos` / efecto extra, eliminar el `await ReporteService.getResumenGeneral(...)` dentro del try vacío.

- [ ] **Step 4: Replace hardcoded compare insights**

En el `useMemo` de `insights`, para Comparar devolver aún `generarInsightsResumen`-compatible o, mejor, calcular `signal` aparte:

```ts
const signal = useMemo(() => {
  if (modo === 'comparar' && comparativa && !comparativa.invalidSameMonth) {
    return buildSignalFromCompareDeltas({
      crecimientoVentas: comparativa.deltas.crecimientoVentas,
      crecimientoOrdenes: comparativa.deltas.crecimientoOrdenes,
      crecimientoTicket: comparativa.deltas.crecimientoTicket,
      etiquetaBase: comparativa.etiquetaBase,
      etiquetaComparar: comparativa.etiquetaComparar,
    });
  }
  if (!resumen || !insights) return null;
  return buildSignalFromScore({
    score: insights.score,
    headline: insights.headline,
    summary: insights.summary,
    leadDeltaPct: resumen.crecimientoVentas,
    leadDeltaLabel: 'Ingresos',
  });
}, [modo, comparativa, resumen, insights]);
```

(Keep `insights` from `generarInsightsResumen` for drivers/export score in Rápido; Comparar export can use signal label instead of fake score.)

- [ ] **Step 5: First-fold JSX (ambos modos)**

```tsx
{signal ? (
  <div className="report-signal-fold">
    <ReportSignalPanel signal={signal} />
    <ReportSignalMatrix
      deltaVsLabel={modo === 'comparar' ? 'mes base' : 'ant.'}
      cells={
        modo === 'comparar' && comparativa
          ? [
              {
                id: 'ing',
                label: 'Ingresos',
                value: comparativa.comparar.totalVentas,
                baseValue: comparativa.base.totalVentas,
                baseLabel: comparativa.etiquetaBase,
                deltaPct: comparativa.deltas.crecimientoVentas,
                format: 'moneda',
              },
              {
                id: 'ord',
                label: 'Ventas',
                value: comparativa.comparar.totalOrdenes,
                baseValue: comparativa.base.totalOrdenes,
                baseLabel: comparativa.etiquetaBase,
                deltaPct: comparativa.deltas.crecimientoOrdenes,
                format: 'entero',
              },
              {
                id: 'tkt',
                label: 'Ticket prom.',
                value: comparativa.comparar.ticketPromedio,
                baseValue: comparativa.base.ticketPromedio,
                baseLabel: comparativa.etiquetaBase,
                deltaPct: comparativa.deltas.crecimientoTicket,
                format: 'moneda',
              },
              {
                id: 'uni',
                label: 'Unidades',
                value: comparativa.comparar.productosVendidos,
                baseValue: comparativa.base.productosVendidos,
                baseLabel: comparativa.etiquetaBase,
                deltaPct: comparativa.deltas.crecimientoProductos,
                format: 'entero',
              },
            ]
          : [
              {
                id: 'ing',
                label: 'Ingresos',
                value: resumen!.totalVentas,
                deltaPct: resumen!.crecimientoVentas,
                format: 'moneda',
              },
              {
                id: 'ord',
                label: 'Ventas',
                value: resumen!.totalOrdenes,
                deltaPct: resumen!.crecimientoOrdenes,
                format: 'entero',
              },
              {
                id: 'tkt',
                label: 'Ticket prom.',
                value: resumen!.ticketPromedio,
                deltaPct: resumen!.crecimientoTicket,
                format: 'moneda',
              },
              {
                id: 'uni',
                label: 'Unidades',
                value: resumen!.productosVendidos,
                deltaPct: resumen!.crecimientoProductos,
                format: 'entero',
              },
            ]
      }
    />
  </div>
) : null}
```

**Antes del JSX**, en el mismo task:

1. En `reportesCompararMeses.ts`, añadir `crecimientoProductos` a `deltas` (y al objeto vacío `invalidSameMonth`) con `pctCrecimientoComparar(comparar.productosVendidos, base.productosVendidos)`. Extender `reportesCompararMeses.test.ts` con un assert.
2. En `ResumenVentasLocal` + cálculo de `cargarDatos`, añadir `crecimientoProductos` comparando unidades del periodo vs periodo anterior (mismo patrón que ingresos/órdenes).

- [ ] **Step 6: Loading skeleton**

Si `loading`, renderizar:

```tsx
<div className="report-signal-fold" aria-busy="true">
  <div className="report-signal-skeleton" />
  <div className="report-signal-matrix">
    <div className="report-signal-skeleton" />
    <div className="report-signal-skeleton" />
    <div className="report-signal-skeleton" />
    <div className="report-signal-skeleton" />
  </div>
</div>
```

(en lugar de solo `MetricCardsSkeleton` genérico, o combinar).

- [ ] **Step 7: Run unit tests**

```bash
cd front-end/sistemaReact-Main && npm test -- src/utils/reportSignal.test.ts src/utils/reportesCompararMeses.test.ts
```

Expected: PASS.

---

### Task 6: Command deck DK (solo Resumen)

**Files:**
- Modify: `front-end/sistemaReact-Main/src/components/reportes/layout/ReportCommandDeck.tsx`
- Modify: `front-end/sistemaReact-Main/src/pages/reportes/ReportesPage.tsx` (o shell que aplica `.reports-analytics`)

- [ ] **Step 1: Flag clase en contenedor analytics**

Donde esté `className="reports-analytics"` (p. ej. `ReportPageShell` / `ReportesPage`), cuando `tabActiva === 'resumen'` añadir `reports-analytics--signal`:

```tsx
className={`reports-analytics${tabActiva === 'resumen' ? ' reports-analytics--signal' : ''}`}
```

- [ ] **Step 2: Copy soft-mono en deck (solo Resumen)**

En `ReportCommandDeck`, si `esResumen`:

- Eyebrow: `DK · Reportes · Resumen`
- Título: `Ritmo del negocio` (o mantener “Reportes” + subtítulo “Ritmo del negocio”)
- Quitar icon-wrap ruidoso si compite; opcional: ocultar `report-command-deck__icon-wrap` en señal mode vía CSS `.reports-analytics--signal .report-command-deck__icon-wrap { display: none; }`

No cambiar chrome de otras tabs.

---

### Task 7: Charts monocromo + polish paneles

**Files:**
- Modify: `front-end/sistemaReact-Main/src/components/reportes/layout/reportChartTheme.tsx`
- Modify: `front-end/sistemaReact-Main/src/styles/reports-analytics.css` (scoped under `--signal`)

- [ ] **Step 1: Gradiente monocromo para Resumen**

Añadir export:

```tsx
export const ReportChartGradientMonoDef = ({ id = 'reportChartGradientMono' }: { id?: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--app-accent)" stopOpacity={0.55} />
      <stop offset="100%" stopColor="var(--app-text-faint)" stopOpacity={0.08} />
    </linearGradient>
  </defs>
);
```

En `ReportTrendPanel` (solo si se usa desde Resumen), pasar `gradientId` mono ya usado (`areaGradResumen`) y en el JSX del área usar stops `var(--app-accent)` / faint en lugar de indigo tokens — o definir esos stops inline en el panel Resumen.

Mínimo viable: en CSS:

```css
.reports-analytics--signal {
  --app-chart-gradient-start: var(--app-accent);
  --app-chart-gradient-end: var(--app-text-faint);
}
```

Esto evita indigo en la tab Resumen sin tocar otras vistas que compartan tokens globales fuera del scope.

- [ ] **Step 2: Tooltip Comparar con absolutos**

En `ReportCompareMonthsChart.tsx`, asegurar tooltip muestra valores de base/focus reales (no solo índice normalizado). Si el chart ya tiene raw fields en `chartSerie`, incluirlos en el tooltip content.

---

### Task 8: Verificación final

- [ ] **Step 1: Unit tests**

```bash
cd front-end/sistemaReact-Main && npm test
```

Expected: PASS (o al menos suites touchadas).

- [ ] **Step 2: Typecheck / build**

```bash
cd front-end/sistemaReact-Main && npm run build
```

Expected: exit 0.

- [ ] **Step 3: Checklist manual en `/reportes?tab=resumen`**

1. Rápido Hoy/7d/30d: señal + matriz 2×2 + tendencia/drivers; deltas con flecha+%.
2. Comparar: misma estructura; sin score inventado; base visible en celdas.
3. Meses iguales: aviso, no crash.
4. Sin ventas: empty state claro.
5. Tab Ventas/Productos: chrome **sin** `reports-analytics--signal` (sin pills forzadas).
6. Contraste: chips legibles; sin indigo en área chart Resumen.
7. `prefers-reduced-motion`: sin hover translate ruidoso.

- [ ] **Step 4: Commit (solo si el usuario lo pide)**

No crear commit automáticamente.

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Overhaul señal + matriz soft-mono | 2–5 |
| Comparar misma estructura | 5 |
| Señal Comparar real | 1, 5 |
| 4 KPIs incl. unidades | 5 |
| Command deck solo Resumen | 6 |
| a11y color+texto | 3–4 |
| dayData periodo activo | 5 |
| Quitar getResumenGeneral muerto | 5 |
| Charts sin indigo en Resumen | 7 |
| Loading skeleton | 5 |
| Otras tabs intactas | 6 |
| Sin backend nuevo | (all) |

## Placeholder scan

Sin TBD. Unidades llevan `crecimientoProductos` en Comparar y en Rápido (Task 5).
