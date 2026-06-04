export interface ReportDriver {
  id: string;
  label: string;
  value: string;
  sub?: string;
  icon: string;
}

export interface ReportInsightResult {
  score: number;
  headline: string;
  summary: string;
  drivers: ReportDriver[];
  actions: string[];
  peakDayLabel?: string;
  peakDaySharePct?: number;
}

export interface ResumenInsightInput {
  totalVentas: number;
  totalOrdenes: number;
  ticketPromedio: number;
  productosVendidos: number;
  crecimientoVentas: number;
  crecimientoOrdenes: number;
  crecimientoTicket: number;
  topCategoria?: { nombre: string; porcentaje: number };
  topProducto?: { nombre: string; sharePct: number };
  metodoPagoDominante?: { nombre: string; porcentaje: number };
  chartPoints?: Array<{ label: string; ventas: number }>;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function calcularPico(chartPoints: Array<{ label: string; ventas: number }> | undefined) {
  if (!chartPoints?.length) return { peakDayLabel: undefined, peakDaySharePct: undefined };
  const total = chartPoints.reduce((s, p) => s + p.ventas, 0);
  if (total <= 0) return { peakDayLabel: undefined, peakDaySharePct: undefined };
  const max = chartPoints.reduce((best, p) => (p.ventas > best.ventas ? p : best), chartPoints[0]);
  return {
    peakDayLabel: max.label,
    peakDaySharePct: Math.round((max.ventas / total) * 100),
  };
}

export function calcularSaludComercial(input: ResumenInsightInput): number {
  let score = 50;
  if (input.crecimientoVentas > 10) score += 20;
  else if (input.crecimientoVentas > 0) score += 10;
  else if (input.crecimientoVentas < -15) score -= 25;
  else if (input.crecimientoVentas < 0) score -= 10;

  if (input.topCategoria && input.topCategoria.porcentaje > 60) score -= 12;
  else if (input.topCategoria && input.topCategoria.porcentaje < 40) score += 8;

  if (input.topProducto && input.topProducto.sharePct > 35) score -= 8;
  else if (input.topProducto && input.topProducto.sharePct > 0 && input.topProducto.sharePct < 20) score += 5;

  if (input.totalOrdenes === 0) score = 20;
  return clamp(Math.round(score), 0, 100);
}

export function generarInsightsResumen(input: ResumenInsightInput): ReportInsightResult {
  const score = calcularSaludComercial(input);
  const { peakDayLabel, peakDaySharePct } = calcularPico(input.chartPoints);
  const actions: string[] = [];

  if (input.crecimientoVentas > 10) {
    actions.push('Ritmo fuerte de ingresos: asegura stock en los 3 productos más vendidos.');
  } else if (input.crecimientoVentas < -15) {
    actions.push('Caída relevante vs período anterior: revisa inventario y promociones en días débiles.');
  }

  if (input.topCategoria && input.topCategoria.porcentaje > 60) {
    actions.push(
      `Alta dependencia en "${input.topCategoria.nombre}" (${input.topCategoria.porcentaje.toFixed(0)}%): diversifica campañas.`
    );
  }

  if (input.topProducto && input.topProducto.sharePct > 25) {
    actions.push(`SKU ancla "${input.topProducto.nombre}": valida reposición y variantes (talla/color).`);
  }

  if (peakDayLabel && peakDaySharePct && peakDaySharePct >= 30) {
    actions.push(`El pico en ${peakDayLabel} concentra ~${peakDaySharePct}% del período: refuerza personal ese día.`);
  }

  if (actions.length === 0) {
    actions.push('Mantén monitoreo semanal de ticket promedio y rotación por categoría.');
  }

  const drivers: ReportDriver[] = [];
  if (input.topCategoria) {
    drivers.push({
      id: 'cat',
      label: 'Categoría líder',
      value: input.topCategoria.nombre,
      sub: `${input.topCategoria.porcentaje.toFixed(0)}% del mix`,
      icon: 'category',
    });
  }
  if (input.topProducto) {
    drivers.push({
      id: 'prod',
      label: 'Producto ancla',
      value: input.topProducto.nombre,
      sub: `${input.topProducto.sharePct.toFixed(0)}% unidades`,
      icon: 'checkroom',
    });
  }
  if (input.metodoPagoDominante) {
    drivers.push({
      id: 'pago',
      label: 'Pago dominante',
      value: input.metodoPagoDominante.nombre,
      sub: `${input.metodoPagoDominante.porcentaje.toFixed(0)}% transacciones`,
      icon: 'payments',
    });
  }
  let headline = 'Rendimiento estable';
  let summary = 'Las métricas del período no muestran alertas críticas.';
  if (score >= 75) {
    headline = 'Salud comercial sólida';
    summary = 'Vas mejor que el período anterior en indicadores clave.';
  } else if (score < 45) {
    headline = 'Atención recomendada';
    summary = 'Hay señales de presión en ingresos o concentración de ventas.';
  } else if (score >= 55) {
    headline = 'Buen ritmo con matices';
    summary = 'Resultados positivos; revisa concentración en categoría o producto estrella.';
  }

  return {
    score,
    headline,
    summary,
    drivers: drivers.slice(0, 3),
    actions: actions.slice(0, 3),
    peakDayLabel,
    peakDaySharePct,
  };
}

export function generarInsightPicoGrafico(
  chartPoints: Array<{ label: string; ventas: number }>
): string | null {
  const { peakDayLabel, peakDaySharePct } = calcularPico(chartPoints);
  if (!peakDayLabel || !peakDaySharePct || peakDaySharePct < 20) return null;
  return `El ${peakDayLabel} concentró ~${peakDaySharePct}% de los ingresos del período.`;
}

export function generarInsightProductos(
  productos: Array<{ nombreProducto: string; cantidadVendida: number }>
): string | null {
  if (!productos.length) return null;
  const total = productos.reduce((s, p) => s + p.cantidadVendida, 0);
  if (total <= 0) return null;
  const top5 = [...productos]
    .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, 5);
  const top5Sum = top5.reduce((s, p) => s + p.cantidadVendida, 0);
  const pct = Math.round((top5Sum / total) * 100);
  if (pct >= 50) {
    return `El top 5 concentra ${pct}% de unidades: prioriza reposición y evita quiebres de stock.`;
  }
  return null;
}

export function generarInsightCategoria(
  items: Array<{ categoria: string; ingresosTotales: number }>,
  parentNombre?: string
): string | null {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + Number(i.ingresosTotales || 0), 0);
  if (total <= 0) return null;
  const top = [...items].sort((a, b) => Number(b.ingresosTotales) - Number(a.ingresosTotales))[0];
  const pct = Math.round((Number(top.ingresosTotales) / total) * 100);
  const ctx = parentNombre ? ` dentro de "${parentNombre}"` : '';
  return `"${top.categoria}" aporta ${pct}%${ctx}; evalúa promociones cruzadas con el resto del mix.`;
}
