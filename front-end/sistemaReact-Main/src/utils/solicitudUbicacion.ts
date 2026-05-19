import type { AlmacenSolicitud } from "@/types/AlmacenSolicitudes";
import type { UbicacionSolicitudResumen } from "@/components/almacen-tablero/AlmacenSolicitudRuta";

export function resumenOrigenDeSolicitud(s: AlmacenSolicitud): UbicacionSolicitudResumen {
  return {
    piso: s.pisoOrigen,
    area: s.sectorOrigen,
    etiqueta: s.etiquetaOrigen,
  };
}

export function resumenDestinoDeSolicitud(s: AlmacenSolicitud): UbicacionSolicitudResumen {
  return {
    piso: s.pisoDestino,
    area: s.sectorDestino,
    etiqueta: s.etiquetaDestino,
  };
}

export function destinosUnicosEnLote(cards: AlmacenSolicitud[]): UbicacionSolicitudResumen[] {
  const vistos = new Set<string>();
  const out: UbicacionSolicitudResumen[] = [];
  for (const c of cards) {
    const d = resumenDestinoDeSolicitud(c);
    const key = d.etiqueta ?? `${d.piso}|${d.area}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    out.push(d);
  }
  return out;
}
