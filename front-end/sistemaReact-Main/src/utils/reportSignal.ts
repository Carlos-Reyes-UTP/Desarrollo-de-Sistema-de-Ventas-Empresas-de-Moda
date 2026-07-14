export type ReportSignalTone = 'up' | 'mixed' | 'down';

export interface ReportSignalBasisItem {
  label: string;
  detail: string;
}

export interface ReportSignalView {
  tone: ReportSignalTone;
  label: string;
  headline: string;
  summary: string;
  leadDelta?: { label: string; pct: number };
  contextLabel?: string;
  basisTitle: string;
  /** Frase corta arriba del listado en ¿Por qué? */
  basisLead?: string;
  basisItems: ReportSignalBasisItem[];
}

function fmtSignedPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Texto simple: "subió 12.0%", "bajó 3.2%", "igual (0%)". */
function cambioPlain(pct: number): string {
  if (pct > 0) return `subió ${pct.toFixed(1)}%`;
  if (pct < 0) return `bajó ${Math.abs(pct).toFixed(1)}%`;
  return 'está igual (0%)';
}

function intensidadCambio(pct: number): 'mucho' | 'algo' | 'poco' | 'nada' {
  const a = Math.abs(pct);
  if (a < 0.05) return 'nada';
  if (a < 5) return 'poco';
  if (a < 20) return 'algo';
  return 'mucho';
}

/** Explica un cambio en lenguaje de negocio. */
function explicaCambio(pct: number, sujeto: string): string {
  const nivel = intensidadCambio(pct);
  if (nivel === 'nada') return `${sujeto}: casi sin cambio (${fmtSignedPct(pct)}).`;
  if (pct > 0) {
    if (nivel === 'mucho') return `${sujeto}: subió con fuerza (${fmtSignedPct(pct)}).`;
    if (nivel === 'algo') return `${sujeto}: subió (${fmtSignedPct(pct)}).`;
    return `${sujeto}: subió un poco (${fmtSignedPct(pct)}).`;
  }
  if (nivel === 'mucho') return `${sujeto}: bajó con fuerza (${fmtSignedPct(pct)}).`;
  if (nivel === 'algo') return `${sujeto}: bajó (${fmtSignedPct(pct)}).`;
  return `${sujeto}: bajó un poco (${fmtSignedPct(pct)}).`;
}

function explicaResultado(
  tone: ReportSignalTone,
  label: string,
  v: number,
  o: number,
  t: number
): string {
  if (tone === 'up') {
    return `${label}: el negocio gana ritmo — el dinero ${cambioPlain(v)} y las ventas ${cambioPlain(o)}.`;
  }
  if (tone === 'down') {
    if (Math.abs(v) >= Math.abs(o) && Math.abs(v) >= Math.abs(t)) {
      return `${label}: lo que más pesa es que entró menos dinero (${fmtSignedPct(v)}).`;
    }
    if (Math.abs(t) > Math.abs(v) && Math.abs(t) > Math.abs(o)) {
      return `${label}: cada venta dejó menos (ticket ${fmtSignedPct(t)}), y eso arrastra el resultado.`;
    }
    return `${label}: el negocio perdió fuerza frente al período con el que se compara.`;
  }
  if (v > 0 && t < 0) {
    return `${label}: hubo más dinero, pero cada venta rindió menos (ticket ${fmtSignedPct(t)}).`;
  }
  if (v > 0 && o < 0) {
    return `${label}: entró más dinero con menos ventas; conviene revisar el ticket y el mix.`;
  }
  if (v < 0 && (o > 0 || t > 0)) {
    return `${label}: entró menos dinero, aunque otra parte (ventas o ticket) mejoró.`;
  }
  return `${label}: el cuadro es mixto — unas cifras ayudan y otras restan.`;
}

function basisLeadFromTone(tone: ReportSignalTone, vsHint: string): string {
  if (tone === 'up') {
    return `Así se armó la lectura “Excelente”${vsHint}.`;
  }
  if (tone === 'down') {
    return `Así se armó la lectura “Malo”${vsHint}.`;
  }
  return `Así se armó la lectura “Bueno” (ni todo bien ni todo mal)${vsHint}.`;
}

export function mapScoreToSignalTone(score: number): ReportSignalTone {
  if (score >= 75) return 'up';
  if (score < 45) return 'down';
  return 'mixed';
}

export function signalLabel(tone: ReportSignalTone): string {
  if (tone === 'up') return 'Excelente';
  if (tone === 'down') return 'Malo';
  return 'Bueno';
}

function summaryFromDeltas(v: number, o: number, t: number, tone: ReportSignalTone): string {
  if (tone === 'up') {
    return `El negocio va bien: el dinero ${cambioPlain(v)} y las ventas ${cambioPlain(o)}.`;
  }
  if (tone === 'down') {
    return `El negocio va mal: el dinero ${cambioPlain(v)}. Revisa precios, stock o campañas.`;
  }

  if (v > 0 && t < 0) {
    return `Hay dinero de más (${fmtSignedPct(v)}), pero cada venta deja menos (ticket ${fmtSignedPct(t)}).`;
  }
  if (v > 0 && o < 0) {
    return `Hay más dinero (${fmtSignedPct(v)}), pero hubo menos ventas (${fmtSignedPct(o)}).`;
  }
  if (v < 0 && (o > 0 || t > 0)) {
    return `Entró menos dinero (${fmtSignedPct(v)}), aunque otra parte del negocio mejoró.`;
  }
  if (v === 0) {
    return `El dinero no cambió, pero las ventas ${cambioPlain(o)} y el ticket ${cambioPlain(t)}.`;
  }
  return `Unas cifras suben y otras bajan. Revisa ingresos, ventas y ticket abajo.`;
}

function buildBasisItems(tone: ReportSignalTone, label: string, v: number, o: number, t: number): ReportSignalBasisItem[] {
  return [
    { label: 'Lectura', detail: explicaResultado(tone, label, v, o, t) },
    { label: 'Dinero', detail: explicaCambio(v, 'Lo que entró en caja') },
    { label: 'Ventas', detail: explicaCambio(o, 'Cuántas ventas se hicieron') },
    { label: 'Ticket', detail: explicaCambio(t, 'Promedio por cada venta') },
  ];
}

export function buildSignalFromScore(input: {
  score: number;
  headline?: string;
  summary?: string;
  leadDeltaPct?: number;
  leadDeltaLabel?: string;
  crecimientoVentas?: number;
  crecimientoOrdenes?: number;
  crecimientoTicket?: number;
}): ReportSignalView {
  const tone = mapScoreToSignalTone(input.score);
  const label = signalLabel(tone);
  const v = input.crecimientoVentas;
  const o = input.crecimientoOrdenes;
  const t = input.crecimientoTicket;
  const hasDeltas = v !== undefined && o !== undefined && t !== undefined;

  const summary = hasDeltas ? summaryFromDeltas(v, o, t, tone) : (input.summary ?? label);

  const basisItems: ReportSignalBasisItem[] = hasDeltas
    ? buildBasisItems(tone, label, v, o, t)
    : [
        {
          label: 'Lectura',
          detail: `${label}: se calcula con la salud general del período (${input.score} de 100).`,
        },
      ];

  return {
    tone,
    label,
    headline: input.headline ?? label,
    summary,
    leadDelta:
      input.leadDeltaPct !== undefined && input.leadDeltaLabel
        ? { label: input.leadDeltaLabel, pct: input.leadDeltaPct }
        : hasDeltas
          ? { label: 'Ingresos', pct: v }
          : undefined,
    basisTitle: '¿Por qué esta lectura?',
    basisLead: hasDeltas
      ? basisLeadFromTone(tone, ' frente al período anterior')
      : 'Resumen de cómo se formó esta señal.',
    basisItems,
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

  const label = signalLabel(tone);
  const contextLabel = `${input.etiquetaComparar} vs ${input.etiquetaBase}`;
  const summary = `Comparando ${contextLabel}: ${summaryFromDeltas(v, o, input.crecimientoTicket, tone)}`;

  return {
    tone,
    label,
    headline: label,
    summary,
    contextLabel,
    leadDelta: { label: 'Ingresos', pct: v },
    basisTitle: '¿Por qué esta lectura?',
    basisLead: basisLeadFromTone(
      tone,
      ` al mirar ${input.etiquetaComparar} frente a ${input.etiquetaBase}`
    ),
    basisItems: buildBasisItems(tone, label, v, o, input.crecimientoTicket),
  };
}
