# Dashboard Admin/Gerente — Columna operativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar los homes de admin y gerente con ritmo de ventas del mes, top/bottom 5 variantes, últimas 10 ventas y toggle Mes actual | vs mes anterior, mejorando jerarquía y accesibilidad visual.

**Architecture:** Extraer lógica pura de mes/comparación/ranking en `dashboardMes.ts` (TDD); UI compartida bajo `shared/ui/dashboard/` + hook `useDashboardVentasMes`; cada página solo inyecta su bloque de rol. Reutilizar `reportesCompararMeses` (`mesActual`, `mesAnteriorA`, `rangoMesCalendario`, `metricasDesdeVentasEnRango`, `pctCrecimientoComparar`) y `reportProductRank` (`getTopNByUnits`, `getBottomNByUnits`, `formatVarianteLabel`). Sin backend nuevo. Commits solo si el usuario lo pide.

**Tech Stack:** React 19, Vite, Tailwind v4, tokens `--app-*`, Vitest, Recharts, `VentaService`, `DashboardMetricCard` / `DashboardPanel`.

**Spec:** [docs/superpowers/specs/2026-07-13-dashboard-admin-gerente-columna-operativa-design.md](../specs/2026-07-13-dashboard-admin-gerente-columna-operativa-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| Create `front-end/sistemaReact-Main/src/utils/dashboardMes.ts` | Modo compare, series día-a-día, KPIs+deltas, ranking variantes desde ventas, slice últimas 10, label método pago |
| Create `front-end/sistemaReact-Main/src/utils/dashboardMes.test.ts` | Unit tests |
| Create `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardMonthToggle.tsx` | Control Mes actual \| vs mes anterior |
| Create `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardSalesPaceChart.tsx` | Ritmo Recharts (1 o 2 series) |
| Create `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardRecentSalesTable.tsx` | Tabla últimas 10 |
| Create `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardVariantRankPanel.tsx` | Más / menos vendidas |
| Create `front-end/sistemaReact-Main/src/hooks/useDashboardVentasMes.ts` | Fetch + estado compartido |
| Modify `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardMetricCard.tsx` | Prop opcional `delta` tipada (o usar `sub` con clase); preferir `delta?: { pct: number \| null; compareOn: boolean }` |
| Modify `front-end/sistemaReact-Main/src/pages/dashboard/DashboardAdminPage.tsx` | Wire layout + bloque actividad |
| Modify `front-end/sistemaReact-Main/src/pages/dashboard/DashboardGerentePage.tsx` | Wire layout + bloque personal |
| Optional `front-end/sistemaReact-Main/src/styles/` o clases Tailwind locales | Solo si hacen falta estilos de toggle/delta no cubiertos por `--app-*` |

**Do not modify:** Reportes tabs, dashboard almacenero, backend Java, login.

---

### Task 1: Utilidades de mes (TDD)

**Files:**
- Create: `front-end/sistemaReact-Main/src/utils/dashboardMes.ts`
- Create: `front-end/sistemaReact-Main/src/utils/dashboardMes.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// front-end/sistemaReact-Main/src/utils/dashboardMes.test.ts
import { describe, expect, it } from 'vitest';
import type { Venta } from '@/types/Venta';
import {
  leerModoCompararMes,
  formatDeltaPct,
  serieRitmoDiario,
  kpisDashboardMes,
  rankVariantesDesdeVentas,
  ultimasNVentas,
  etiquetaMetodoPago,
  type DashboardModoMes,
} from './dashboardMes';

function venta(partial: Partial<Venta> & { fechaVenta: string; totalVentas: number }): Venta {
  return {
    metodoPago: 'EFECTIVO',
    tipoComprobante: 'BOLETA',
    detalles: [],
    ...partial,
  } as Venta;
}

describe('formatDeltaPct', () => {
  it('returns em dash when compare is off', () => {
    expect(formatDeltaPct(12, false)).toBe(null);
  });
  it('returns null when pct is null (no base)', () => {
    expect(formatDeltaPct(null, true)).toBe(null);
  });
  it('formats signed percent when compare on', () => {
    expect(formatDeltaPct(8.2, true)).toMatch(/\+8/);
    expect(formatDeltaPct(-1.3, true)).toMatch(/−1|-/);
  });
});

describe('serieRitmoDiario', () => {
  it('builds one point per day from 1 to hoy and sums ventas', () => {
    const hoy = new Date(2026, 6, 13); // 13 jul 2026
    const ventas = [
      venta({ fechaVenta: '2026-07-01T10:00:00', totalVentas: 100 }),
      venta({ fechaVenta: '2026-07-01T18:00:00', totalVentas: 50 }),
      venta({ fechaVenta: '2026-07-13T09:00:00', totalVentas: 20 }),
    ];
    const serie = serieRitmoDiario(ventas, { year: 2026, month: 7 }, hoy);
    expect(serie).toHaveLength(13);
    expect(serie[0].dia).toBe(1);
    expect(serie[0].actual).toBe(150);
    expect(serie[12].actual).toBe(20);
  });

  it('aligns mesAnterior by day index when provided', () => {
    const hoy = new Date(2026, 6, 5);
    const actual = [venta({ fechaVenta: '2026-07-02T10:00:00', totalVentas: 10 })];
    const ant = [
      venta({ fechaVenta: '2026-06-02T10:00:00', totalVentas: 40 }),
      venta({ fechaVenta: '2026-06-30T10:00:00', totalVentas: 99 }),
    ];
    const serie = serieRitmoDiario(actual, { year: 2026, month: 7 }, hoy, ant, {
      year: 2026,
      month: 6,
    });
    expect(serie[1].actual).toBe(10);
    expect(serie[1].anterior).toBe(40);
    // día 30 de junio no aparece si hoy es día 5
    expect(serie.every((p) => p.dia <= 5)).toBe(true);
  });
});

describe('kpisDashboardMes', () => {
  it('computes KPIs for current month range', () => {
    const hoy = new Date(2026, 6, 13);
    const ventas = [
      venta({
        fechaVenta: '2026-07-10T12:00:00',
        totalVentas: 100,
        cliente: { idCliente: 1 } as Venta['cliente'],
        detalles: [{ cantidad: 2, precioUnitario: 50, productoVariante: {} as never }],
      }),
    ];
    const k = kpisDashboardMes(ventas, { year: 2026, month: 7 }, hoy);
    expect(k.totalVentas).toBe(100);
    expect(k.productosVendidos).toBe(2);
    expect(k.clientesActivos).toBe(1);
    expect(k.ticketPromedio).toBe(100);
  });

  it('sets deltas null when compare off or no anterior base', () => {
    const hoy = new Date(2026, 6, 13);
    const ventas = [venta({ fechaVenta: '2026-07-10T12:00:00', totalVentas: 100 })];
    const off = kpisDashboardMes(ventas, { year: 2026, month: 7 }, hoy, false);
    expect(off.deltas).toBeNull();
  });
});

describe('rankVariantesDesdeVentas', () => {
  it('returns top and bottom by units', () => {
    const makeDet = (id: number, nombre: string, color: string, talla: string, qty: number) => ({
      cantidad: qty,
      precioUnitario: 10,
      productoVariante: {
        idProductoVariante: id,
        producto: { nombreProducto: nombre },
        color: { nombre: color },
        talla: { nombreTalla: talla },
        cantidad: 0,
      },
    });
    const ventas = [
      venta({
        fechaVenta: '2026-07-05T10:00:00',
        totalVentas: 100,
        detalles: [
          makeDet(1, 'Polo', 'Azul', 'M', 40) as never,
          makeDet(2, 'Jean', 'Negro', '32', 30) as never,
          makeDet(3, 'Blusa', 'Rosa', 'S', 2) as never,
          makeDet(4, 'Short', 'Beige', 'L', 3) as never,
          makeDet(5, 'Casaca', 'Denim', 'L', 20) as never,
          makeDet(6, 'Gorra', 'Rojo', 'U', 5) as never,
        ],
      }),
    ];
    const { top, bottom } = rankVariantesDesdeVentas(ventas, 5);
    expect(top[0].unidades).toBe(40);
    expect(top[0].label).toContain('Polo');
    expect(bottom[0].unidades).toBeLessThanOrEqual(bottom[bottom.length - 1]?.unidades ?? Infinity);
  });
});

describe('ultimasNVentas', () => {
  it('returns newest N by fechaVenta desc', () => {
    const list = [
      venta({ idVenta: 1, fechaVenta: '2026-07-01T10:00:00', totalVentas: 1 }),
      venta({ idVenta: 2, fechaVenta: '2026-07-13T18:00:00', totalVentas: 2 }),
      venta({ idVenta: 3, fechaVenta: '2026-07-12T09:00:00', totalVentas: 3 }),
    ];
    const u = ultimasNVentas(list, 2);
    expect(u.map((v) => v.idVenta)).toEqual([2, 3]);
  });
});

describe('etiquetaMetodoPago', () => {
  it('handles string and object', () => {
    expect(etiquetaMetodoPago('YAPE')).toBe('YAPE');
    expect(etiquetaMetodoPago({ nombreMetodoPago: 'Tarjeta' } as never)).toBe('Tarjeta');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run (desde `front-end/sistemaReact-Main`):

```bash
npm test -- src/utils/dashboardMes.test.ts
```

Expected: FAIL (module not found / exports missing).

- [ ] **Step 3: Implement `dashboardMes.ts`**

```ts
// front-end/sistemaReact-Main/src/utils/dashboardMes.ts
import type { Venta } from '@/types/Venta';
import type { MesRef } from '@/utils/reportesCompararMeses';
import {
  mesActual,
  mesAnteriorA,
  metricasDesdeVentasEnRango,
  pctCrecimientoComparar,
  rangoMesCalendario,
} from '@/utils/reportesCompararMeses';
import { getBottomNByUnits, getTopNByUnits } from '@/utils/reportProductRank';

export type DashboardModoMes = 'actual' | 'comparar';

const STORAGE_KEY = 'dashboard-home-modo-mes';

export function leerModoCompararMes(): DashboardModoMes {
  if (typeof window === 'undefined') return 'actual';
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw === 'comparar' ? 'comparar' : 'actual';
}

export function guardarModoCompararMes(modo: DashboardModoMes): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, modo);
}

export function formatDeltaPct(pct: number | null, compareOn: boolean): string | null {
  if (!compareOn || pct === null || Number.isNaN(pct)) return null;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export interface PuntoRitmoDiario {
  dia: number;
  label: string;
  actual: number;
  anterior?: number;
}

export function serieRitmoDiario(
  ventasActual: Venta[],
  mes: MesRef,
  hoy = new Date(),
  ventasAnterior?: Venta[],
  mesAnt?: MesRef
): PuntoRitmoDiario[] {
  const { inicio, fin } = rangoMesCalendario(mes, hoy);
  const lastDay = fin.getDate();
  const sumByDay = (ventas: Venta[], year: number, month: number) => {
    const map = new Map<number, number>();
    for (const v of ventas) {
      const f = new Date(v.fechaVenta);
      if (Number.isNaN(f.getTime())) continue;
      if (f.getFullYear() !== year || f.getMonth() + 1 !== month) continue;
      const d = f.getDate();
      map.set(d, (map.get(d) ?? 0) + (v.totalVentas ?? 0));
    }
    return map;
  };
  const mapAct = sumByDay(ventasActual, mes.year, mes.month);
  const mapAnt =
    ventasAnterior && mesAnt
      ? sumByDay(ventasAnterior, mesAnt.year, mesAnt.month)
      : null;

  const puntos: PuntoRitmoDiario[] = [];
  for (let dia = 1; dia <= lastDay; dia++) {
    const p: PuntoRitmoDiario = {
      dia,
      label: String(dia),
      actual: mapAct.get(dia) ?? 0,
    };
    if (mapAnt) p.anterior = mapAnt.get(dia) ?? 0;
    puntos.push(p);
  }
  // Filtrar ventas fuera de inicio/fin no es necesario si lastDay ya respeta hoy
  void inicio;
  return puntos;
}

export interface KpisDashboardMes {
  totalVentas: number;
  productosVendidos: number;
  ticketPromedio: number;
  clientesActivos: number;
  deltas: {
    totalVentas: number | null;
    productosVendidos: number | null;
    ticketPromedio: number | null;
    clientesActivos: number | null;
  } | null;
}

export function kpisDashboardMes(
  ventasPool: Venta[],
  mes: MesRef,
  hoy = new Date(),
  compareOn = false,
  mesAntRef?: MesRef
): KpisDashboardMes {
  const rango = rangoMesCalendario(mes, hoy);
  const m = metricasDesdeVentasEnRango(ventasPool, rango);
  const base: KpisDashboardMes = {
    totalVentas: m.totalVentas,
    productosVendidos: m.productosVendidos,
    ticketPromedio: m.ticketPromedio,
    clientesActivos: m.clientesActivos,
    deltas: null,
  };
  if (!compareOn) return base;
  const ant = mesAntRef ?? mesAnteriorA(mes);
  const rangoAnt = rangoMesCalendario(ant, hoy);
  const mAnt = metricasDesdeVentasEnRango(ventasPool, rangoAnt);
  const deltaOrNull = (actual: number, anterior: number): number | null => {
    if (anterior === 0 && actual === 0) return null;
    if (anterior === 0) return null; // UI muestra "—" sin base
    return pctCrecimientoComparar(actual, anterior);
  };
  return {
    ...base,
    deltas: {
      totalVentas: deltaOrNull(m.totalVentas, mAnt.totalVentas),
      productosVendidos: deltaOrNull(m.productosVendidos, mAnt.productosVendidos),
      ticketPromedio: deltaOrNull(m.ticketPromedio, mAnt.ticketPromedio),
      clientesActivos: deltaOrNull(m.clientesActivos, mAnt.clientesActivos),
    },
  };
}

export interface VarianteRankItem {
  id: number;
  label: string;
  unidades: number;
  ingresos: number;
}

export function rankVariantesDesdeVentas(
  ventas: Venta[],
  n = 5
): { top: VarianteRankItem[]; bottom: VarianteRankItem[] } {
  const map = new Map<number, VarianteRankItem>();
  for (const v of ventas) {
    for (const d of v.detalles ?? []) {
      const pv = d.productoVariante;
      const id = pv?.idProductoVariante ?? pv?.idVariante;
      if (id == null) continue;
      const nombre = pv.producto?.nombreProducto ?? pv.nombre ?? 'Producto';
      const color = pv.color?.nombre ?? '—';
      const talla = pv.talla?.nombreTalla ?? '—';
      const prev = map.get(id) ?? {
        id,
        label: `${nombre} · ${color} · ${talla}`,
        unidades: 0,
        ingresos: 0,
      };
      prev.unidades += d.cantidad ?? 0;
      prev.ingresos += (d.subtotal ?? d.cantidad * d.precioUnitario) || 0;
      map.set(id, prev);
    }
  }
  const items = Array.from(map.values()).map((x) => ({
    ...x,
    cantidadVendida: x.unidades,
    ingresosTotales: x.ingresos,
  }));
  const top = getTopNByUnits(items, n).map(({ cantidadVendida: _c, ingresosTotales: _i, ...rest }) => rest);
  const bottom = getBottomNByUnits(items, n).map(({ cantidadVendida: _c, ingresosTotales: _i, ...rest }) => rest);
  return { top, bottom };
}

export function ultimasNVentas(ventas: Venta[], n = 10): Venta[] {
  return [...(ventas ?? [])]
    .filter((v) => v?.fechaVenta)
    .sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime())
    .slice(0, n);
}

export function etiquetaMetodoPago(metodo: Venta['metodoPago']): string {
  if (typeof metodo === 'string') return metodo;
  if (metodo && typeof metodo === 'object') {
    const m = metodo as { nombreMetodoPago?: string; nombre?: string };
    return m.nombreMetodoPago ?? m.nombre ?? '—';
  }
  return '—';
}

export { mesActual, mesAnteriorA, rangoMesCalendario };
```

Ajustar mocks del test al shape real de `Color`/`Talla`/`Producto` del repo si los campos difieren (`nombre` vs `nombreColor`). Revisar tipos en `Color.ts` / `Talla.ts` y alinear.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/utils/dashboardMes.test.ts
```

Expected: PASS (ajustar helpers de test si tipado estricto falla).

- [ ] **Step 5: Commit solo si el usuario lo pide**

---

### Task 2: `DashboardMonthToggle`

**Files:**
- Create: `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardMonthToggle.tsx`

- [ ] **Step 1: Implement toggle accesible**

```tsx
// front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardMonthToggle.tsx
import type { DashboardModoMes } from '@/utils/dashboardMes';

export interface DashboardMonthToggleProps {
  value: DashboardModoMes;
  onChange: (modo: DashboardModoMes) => void;
  etiquetaMesActual: string; // e.g. "Jul 2026"
  etiquetaMesAnterior: string; // e.g. "Jun 2026"
}

export function DashboardMonthToggle({
  value,
  onChange,
  etiquetaMesActual,
  etiquetaMesAnterior,
}: DashboardMonthToggleProps) {
  const btn =
    'px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]';
  const on = 'bg-[var(--app-heading)] text-[var(--app-canvas)]';
  const off = 'app-heading bg-transparent opacity-70 hover:opacity-100';

  return (
    <div
      role="group"
      aria-label="Período del dashboard"
      className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"
    >
      <button
        type="button"
        className={`${btn} ${value === 'actual' ? on : off}`}
        aria-pressed={value === 'actual'}
        onClick={() => onChange('actual')}
      >
        Mes actual
        <span className="ml-1 text-[10px] font-medium opacity-70">{etiquetaMesActual}</span>
      </button>
      <button
        type="button"
        className={`${btn} ${value === 'comparar' ? on : off}`}
        aria-pressed={value === 'comparar'}
        onClick={() => onChange('comparar')}
      >
        vs mes anterior
        <span className="ml-1 text-[10px] font-medium opacity-70">{etiquetaMesAnterior}</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Smoke visual** — importar temporalmente en una página o Story no requerida; se valida al wire (Task 5).

- [ ] **Step 3: Commit solo si el usuario lo pide**

---

### Task 3: Chart, tabla y rankings

**Files:**
- Create: `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardSalesPaceChart.tsx`
- Create: `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardRecentSalesTable.tsx`
- Create: `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardVariantRankPanel.tsx`
- Modify: `front-end/sistemaReact-Main/src/shared/ui/dashboard/DashboardMetricCard.tsx` (delta tipado)

- [ ] **Step 1: Extender `DashboardMetricCard`**

Añadir props opcionales sin romper usos actuales:

```tsx
deltaLabel?: string | null; // e.g. "+8.2% vs jun"
deltaTone?: 'up' | 'down' | 'flat';
```

Render bajo el valor:

```tsx
{deltaLabel ? (
  <p
    className={`mt-2 text-xs font-bold tabular-nums ${
      deltaTone === 'up'
        ? 'text-emerald-700 dark:text-emerald-400'
        : deltaTone === 'down'
          ? 'text-orange-800/80'
          : 'app-metric-label opacity-60'
    }`}
  >
    {deltaLabel}
  </p>
) : null}
```

Preferir clases con tokens del tema si ya existen equivalentes a “up/down”; no introducir púrpura.

- [ ] **Step 2: `DashboardSalesPaceChart`**

Props:

```ts
import type { PuntoRitmoDiario } from '@/utils/dashboardMes';

export interface DashboardSalesPaceChartProps {
  data: PuntoRitmoDiario[];
  compareOn: boolean;
  loading?: boolean;
  empty?: boolean;
}
```

- Usar `DashboardPanel` + `ResponsiveContainer` + `BarChart` (o `ComposedChart` con dos `Bar`).
- Serie `actual` con fill `var(--app-chart-gradient-start)` / accent.
- Si `compareOn`, segunda `Bar` `anterior` con fill atenuado (`opacity` o color muted).
- Empty: texto “Sin ventas en este mes”.
- `aria-label="Ritmo de ventas del mes"`.

- [ ] **Step 3: `DashboardRecentSalesTable`**

Props: `ventas: Venta[]`, `loading?: boolean`.

Columnas: hora (`toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })`), detalle (`Boleta #${id} · N ítems`), método (`etiquetaMetodoPago`), monto (`Intl.NumberFormat es-PE currency PEN`, `tabular-nums`).

Empty: “Aún no hay ventas registradas”.

- [ ] **Step 4: `DashboardVariantRankPanel`**

Props:

```ts
import type { VarianteRankItem } from '@/utils/dashboardMes';

export interface DashboardVariantRankPanelProps {
  top: VarianteRankItem[];
  bottom: VarianteRankItem[];
  loading?: boolean;
}
```

Dos secciones apiladas en sidebar: **Más vendidas** / **Menos vendidas**. Lista `label` + `unidades` tabular. Empty por sección.

- [ ] **Step 5: Commit solo si el usuario lo pide**

---

### Task 4: Hook `useDashboardVentasMes`

**Files:**
- Create: `front-end/sistemaReact-Main/src/hooks/useDashboardVentasMes.ts`

- [ ] **Step 1: Implement hook**

```ts
// front-end/sistemaReact-Main/src/hooks/useDashboardVentasMes.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VentaService } from '@/services/VentaService';
import type { Venta } from '@/types/Venta';
import { etiquetaMesUi } from '@/utils/reportesCompararMeses';
import {
  guardarModoCompararMes,
  kpisDashboardMes,
  leerModoCompararMes,
  mesActual,
  mesAnteriorA,
  rankVariantesDesdeVentas,
  rangoMesCalendario,
  serieRitmoDiario,
  ultimasNVentas,
  type DashboardModoMes,
} from '@/utils/dashboardMes';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useDashboardVentasMes(authReady: boolean) {
  const [modo, setModoState] = useState<DashboardModoMes>(() => leerModoCompararMes());
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hoy = useMemo(() => new Date(), []); // o refrescar en cada load
  const mes = useMemo(() => mesActual(hoy), [hoy]);
  const mesAnt = useMemo(() => mesAnteriorA(mes), [mes]);
  const compareOn = modo === 'comparar';

  const setModo = useCallback((m: DashboardModoMes) => {
    setModoState(m);
    guardarModoCompararMes(m);
  }, []);

  const cargar = useCallback(async () => {
    if (!authReady) return;
    setCargando(true);
    setError(null);
    try {
      const rangoAct = rangoMesCalendario(mes, hoy);
      const rangoAnt = rangoMesCalendario(mesAnt, hoy);
      // Un fetch desde el inicio del mes anterior hasta hoy cubre ambos rangos
      const data = await VentaService.obtenerTodasVentas(
        toIsoDate(rangoAnt.inicio),
        toIsoDate(rangoAct.fin)
      );
      setVentas(Array.isArray(data) ? data : []);
    } catch {
      setError('No se pudieron cargar las ventas. Reintentar.');
      setVentas([]);
    } finally {
      setCargando(false);
    }
  }, [authReady, hoy, mes, mesAnt]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const kpis = useMemo(
    () => kpisDashboardMes(ventas, mes, hoy, compareOn, mesAnt),
    [ventas, mes, hoy, compareOn, mesAnt]
  );

  const ritmo = useMemo(() => {
    const rangoAct = rangoMesCalendario(mes, hoy);
    const act = ventas; // serieRitmoDiario filtra por mes
    return serieRitmoDiario(
      act,
      mes,
      hoy,
      compareOn ? ventas : undefined,
      compareOn ? mesAnt : undefined
    );
  }, [ventas, mes, hoy, compareOn, mesAnt]);

  const rankings = useMemo(() => {
    const rango = rangoMesCalendario(mes, hoy);
    const delMes = ventas.filter((v) => {
      const f = new Date(v.fechaVenta);
      return f >= rango.inicio && f <= rango.fin;
    });
    return rankVariantesDesdeVentas(delMes, 5);
  }, [ventas, mes, hoy]);

  const recientes = useMemo(() => ultimasNVentas(ventas, 10), [ventas]);

  return {
    modo,
    setModo,
    compareOn,
    cargando,
    error,
    reintentar: cargar,
    kpis,
    ritmo,
    rankings,
    recientes,
    etiquetaMesActual: etiquetaMesUi(mes),
    etiquetaMesAnterior: etiquetaMesUi(mesAnt),
  };
}
```

Nota: si `obtenerTodasVentas` exige formato `YYYY-MM-DD` local (no UTC), usar formateo local en vez de `toISOString` para evitar corrimiento de día.

- [ ] **Step 2: Typecheck mental** — el hook no depende de rol.

- [ ] **Step 3: Commit solo si el usuario lo pide**

---

### Task 5: Wire `DashboardAdminPage`

**Files:**
- Modify: `front-end/sistemaReact-Main/src/pages/dashboard/DashboardAdminPage.tsx`

- [ ] **Step 1: Remover selector Hoy/7d/30d** y cálculo basado en `dashboardPeriodo` para métricas/gráfico del home.

- [ ] **Step 2: Estructura JSX objetivo**

```tsx
<main className="...">
  <PageHeader
    variant="dashboard"
    title="Resumen de ventas del mes"
    subtitle={`${etiquetaMesActual} · comparación opcional con ${etiquetaMesAnterior}`}
    actions={<DashboardMonthToggle ... />}
  />

  {error && (
    <div role="alert" className="...">
      {error}
      <button type="button" onClick={reintentar}>Reintentar</button>
    </div>
  )}

  {/* 4 DashboardMetricCard — deltaLabel solo si compareOn */}
  {/* grid lg:grid-cols-12 */}
  {/* col-span-8: DashboardSalesPaceChart + DashboardRecentSalesTable */}
  {/* col-span-4: DashboardVariantRankPanel + bloque Actividad (existente) */}
  {/* CTAs existentes debajo o en sidebar inferior — no ampliar alcance */}
</main>
```

- [ ] **Step 3: Conservar** feed de actividad (`dashboardActividad` + WS) y CTA mayorista/usuarios/reportes si ya existen; no mover a Reportes.

- [ ] **Step 4: Loading** — reutilizar `MetricCardsSkeleton` / `ChartSkeleton` alineados al nuevo layout.

- [ ] **Step 5: Verificar manual** en `/dashboard/admin`:
  - No hay Hoy/7d/30d
  - Toggle cambia deltas y segunda serie
  - Últimas 10 no cambian al toglear
  - Top/bottom 5 visibles
  - Actividad sigue presente

- [ ] **Step 6: Commit solo si el usuario lo pide**

---

### Task 6: Wire `DashboardGerentePage`

**Files:**
- Modify: `front-end/sistemaReact-Main/src/pages/dashboard/DashboardGerentePage.tsx`

- [ ] **Step 1: Misma base que admin** vía `useDashboardVentasMes`.

- [ ] **Step 2: Bloque de rol** = composición de personal (barras por rol) + CTAs pisos/usuarios/reportes actuales. Quitar tabla de últimas ventas duplicada (ya viene en la base compartida).

- [ ] **Step 3: Verificar manual** en `/dashboard/gerente` con mismo checklist de Task 5 + bloque personal.

- [ ] **Step 4: Commit solo si el usuario lo pide**

---

### Task 7: Accesibilidad / responsive polish

**Files:**
- Modificar componentes creados en Tasks 2–3 y páginas si hace falta.

- [ ] **Step 1: Checklist**
  - Focus ring visible en toggle y Reintentar
  - `tabular-nums` en KPIs, montos, unidades
  - Stack mobile: KPIs → ritmo → rankings → últimas 10 → rol (`flex-col` / `grid-cols-1`)
  - Contraste deltas (no verde neón puro)
  - Empty/error states con copy del spec

- [ ] **Step 2: `npm run build`** en `front-end/sistemaReact-Main` — Expected: compile OK.

- [ ] **Step 3: `npm test -- src/utils/dashboardMes.test.ts`** — Expected: PASS.

- [ ] **Step 4: Commit solo si el usuario lo pide**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Ritmo de ventas mes | 1, 3, 4, 5–6 |
| Top/bottom variantes (5) | 1, 3, 4, 5–6 |
| Últimas 10 ventas compartidas | 1, 3, 4, 5–6 |
| Toggle solo vs mes anterior | 1, 2, 4, 5–6 |
| Quitar Hoy/7d/30d | 5, 6 |
| Bloque rol admin/gerente | 5, 6 |
| KPIs + deltas compare ON | 1, 3, 4, 5–6 |
| Skeletons / vacío / error | 3, 4, 5–7 |
| Focus / tabular / jerarquía | 2, 3, 7 |
| Sin backend nuevo / sin Reportes | File map Do-not-modify |

**Gaps cerrados:** ranking desde `detalles` de ventas (evita dependencia de límite del endpoint reportes). Deltas sin base → `null` → UI “—”.

---

## Execution handoff

Plan listo en `docs/superpowers/plans/2026-07-13-dashboard-admin-gerente-columna-operativa.md`.

**Opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — un subagente por tarea, review entre tareas  
2. **Inline Execution** — ejecutar en esta sesión con `executing-plans` y checkpoints  

¿Cuál prefieres?
