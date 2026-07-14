# Productos Signal DK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul de la tab Productos con jerarquía Signal DK: controles compactos, KPI strip, dual Top10/Bottom10 por rotación, tabla ranking, Individual como segundo modo.

**Architecture:** Helpers puros de ranking (`reportProductRank.ts`) + componentes leaf bajo `productos/`; `ProductosMasVendidos` orquesta datos/export/estado. CSS en `reports-analytics.css`. Sin backend nuevo.

**Tech Stack:** React, Vite, Tailwind, Recharts, Vitest, tokens `--app-*`.

**Spec:** [docs/superpowers/specs/2026-07-13-reportes-productos-signal-dk-design.md](../specs/2026-07-13-reportes-productos-signal-dk-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| Create `src/utils/reportProductRank.ts` | Sort por unidades; top10 / bottom10 |
| Create `src/utils/reportProductRank.test.ts` | Unit tests |
| Create `src/components/reportes/productos/ProductReportControls.tsx` | Filtros + chips + segmento |
| Create `src/components/reportes/productos/ProductMetricStrip.tsx` | 4 KPIs |
| Create `src/components/reportes/productos/ProductRankDualPanel.tsx` | Dual Top10 \| Bottom10 |
| Create `src/components/reportes/productos/ProductRankTable.tsx` | Tabla ranking |
| Create `src/components/reportes/productos/ProductIndividualMode.tsx` | Búsqueda + drill variantes |
| Modify `ProductosMasVendidos.tsx` | Wire; quitar pills/área-chart/dropdown viejo |
| Modify `reports-analytics.css` | Clases `product-report-*` + motion |

---

### Task 1: Helpers ranking (TDD)

- [x] Tests + `orderByUnitsDesc` / `getTopN` / `getBottomN`

### Task 2: CSS + leaf components

- [x] Controles, strip, dual, tabla, individual + animaciones soft

### Task 3: Wire ProductosMasVendidos

- [x] Orchestrator; preservar export y fetch

### Task 4: Smoke verify

- [x] Tests unitarios + build/lint check
