import type { AlmacenSolicitud } from "../../types/AlmacenSolicitudes";
import type { UbicacionSolicitudResumen } from "./AlmacenSolicitudRuta";
import {
  destinosUnicosEnLote,
  resumenDestinoDeSolicitud,
  resumenOrigenDeSolicitud,
} from "../../utils/solicitudUbicacion";

export interface GrupoTicket {
  idPrincipal: number;
  idsSolicitud: number[];
  codigoLote: string | null;
  nombreVendedor: string;
  itemsCount: number;
  fechaMasAntigua: string;
  tipoSolicitud: string;
  origen: UbicacionSolicitudResumen;
  destino: UbicacionSolicitudResumen;
  destinosAdicionales: UbicacionSolicitudResumen[];
  urgencia: "baja" | "media" | "alta";
}

export function calcularUrgencia(fecha: string): "baja" | "media" | "alta" {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = diff / 60000;
  if (mins > 5) return "alta";
  if (mins > 2) return "media";
  return "baja";
}

export function agruparTickets(cards: AlmacenSolicitud[]): GrupoTicket[] {
  const grupos: Record<string, GrupoTicket> = {};
  cards.forEach((c) => {
    const key = c.codigoLote ? `${c.codigoLote}-${c.idUsuario}` : `IND-${c.idSolicitud}`;
    if (!grupos[key]) {
      grupos[key] = {
        idPrincipal: c.idSolicitud,
        idsSolicitud: [c.idSolicitud],
        codigoLote: c.codigoLote,
        nombreVendedor: c.nombreVendedor,
        itemsCount: 0,
        fechaMasAntigua: c.fechaCreacion,
        tipoSolicitud: c.tipoSolicitud,
        origen: resumenOrigenDeSolicitud(c),
        destino: resumenDestinoDeSolicitud(c),
        destinosAdicionales: [],
        urgencia: "baja",
      };
    } else {
      grupos[key].idsSolicitud.push(c.idSolicitud);
    }
    grupos[key].itemsCount += c.lineas.reduce((acc, l) => acc + l.cantidad, 0);
    if (new Date(c.fechaCreacion) < new Date(grupos[key].fechaMasAntigua)) {
      grupos[key].fechaMasAntigua = c.fechaCreacion;
    }
  });
  return Object.values(grupos)
    .map((g) => {
      const cardsGrupo = cards.filter((c) => g.idsSolicitud.includes(c.idSolicitud));
      const destinos = destinosUnicosEnLote(cardsGrupo);
      const [primario, ...resto] = destinos;
      return {
        ...g,
        destino: primario ?? g.destino,
        destinosAdicionales: resto,
        urgencia: calcularUrgencia(g.fechaMasAntigua),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.fechaMasAntigua).getTime() - new Date(b.fechaMasAntigua).getTime()
    );
}

/** Id estable para selección UI (coincide con idPrincipal del grupo en la cola). */
export function idPrincipalDeCard(
  cards: AlmacenSolicitud[],
  card: AlmacenSolicitud
): number {
  if (!card.codigoLote) return card.idSolicitud;
  const grupo = cards.filter(
    (c) => c.codigoLote === card.codigoLote && c.idUsuario === card.idUsuario
  );
  return grupo[0]?.idSolicitud ?? card.idSolicitud;
}

export function primeraPrioridad(cards: AlmacenSolicitud[]): number | null {
  const ventas = cards.filter((c) => c.tipoSolicitud === "VENTA");
  if (ventas.length > 0) return idPrincipalDeCard(cards, ventas[0]);
  const repos = cards.filter((c) => c.tipoSolicitud !== "VENTA");
  if (repos.length > 0) return idPrincipalDeCard(cards, repos[0]);
  return null;
}

export function idsSolicitudEnMismoGrupo(
  cards: AlmacenSolicitud[],
  card: AlmacenSolicitud
): number[] {
  if (!card.codigoLote) return [card.idSolicitud];
  return cards
    .filter(
      (c) => c.codigoLote === card.codigoLote && c.idUsuario === card.idUsuario
    )
    .map((c) => c.idSolicitud);
}
