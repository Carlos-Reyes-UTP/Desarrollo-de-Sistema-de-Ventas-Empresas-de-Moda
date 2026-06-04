import type { AlmacenSolicitud } from "../../types/AlmacenSolicitudes";
import type { AlertaReposicion } from "../../types/DashboardStats";
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

export function esReposicion(c: AlmacenSolicitud): boolean {
  return !esVenta(c);
}

/** Ventas pendientes ordenadas por antigüedad (FIFO). */
export function ventasOrdenadas(cards: AlmacenSolicitud[]): AlmacenSolicitud[] {
  return cards
    .filter(esVenta)
    .sort(
      (a, b) =>
        new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
    );
}

export function idPrimeraVenta(cards: AlmacenSolicitud[]): number | null {
  const ordenadas = ventasOrdenadas(cards);
  if (ordenadas.length === 0) return null;
  return idPrincipalDeCard(cards, ordenadas[0]);
}

export function esReposicionPisoSistema(
  nombreVendedor: string | null | undefined
): boolean {
  const n = (nombreVendedor ?? "").trim().toLowerCase();
  return (
    n.includes("reposición piso") ||
    n.includes("reposicion piso") ||
    n === "sistema"
  );
}

export function primeraPrioridad(cards: AlmacenSolicitud[]): number | null {
  const idVenta = idPrimeraVenta(cards);
  if (idVenta != null) return idVenta;
  const repos = cards
    .filter(esReposicion)
    .sort(
      (a, b) =>
        new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
    );
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

export function esVenta(c: AlmacenSolicitud): boolean {
  return c.tipoSolicitud === "VENTA";
}

export function esTicketDesdeAlerta(c: AlmacenSolicitud): boolean {
  return Boolean(c.desdeAlerta) || c.idSolicitud < 0;
}

export function idSolicitudDesdeAlerta(idVariante: number, idUbicacionArea: number): number {
  return -(idVariante * 100_000 + idUbicacionArea);
}

export function colaCubreAlerta(cards: AlmacenSolicitud[], alerta: AlertaReposicion): boolean {
  return cards.some(
    (c) =>
      !esVenta(c) &&
      !esTicketDesdeAlerta(c) &&
      c.idUbicacionAreaDestino === alerta.idUbicacionArea &&
      c.lineas.some((l) => l.idVariante === alerta.idVariante)
  );
}

export function solicitudDesdeAlerta(alerta: AlertaReposicion): AlmacenSolicitud {
  const desc = [alerta.nombreProducto, alerta.color, alerta.talla].filter(Boolean).join(" · ");
  return {
    idSolicitud: idSolicitudDesdeAlerta(alerta.idVariante, alerta.idUbicacionArea),
    tipoSolicitud: "REPOSICION",
    fechaCreacion: new Date().toISOString(),
    idUsuario: null,
    nombreVendedor: "Reposición piso",
    codigoLote: null,
    idUbicacionAreaOrigen: null,
    pisoOrigen: "Almacén",
    sectorOrigen: alerta.area,
    etiquetaOrigen: alerta.area ? `Almacén · ${alerta.area}` : "Almacén",
    idUbicacionAreaDestino: alerta.idUbicacionArea,
    pisoDestino: alerta.ubicacionPiso,
    sectorDestino: alerta.area,
    etiquetaDestino: `${alerta.ubicacionPiso} · ${alerta.area}`,
    lineas: [
      {
        idVariante: alerta.idVariante,
        sku: alerta.sku,
        descripcion: desc,
        cantidad: alerta.cantidadSugerida,
      },
    ],
    desdeAlerta: true,
    idVarianteAlerta: alerta.idVariante,
    idUbicacionAreaAlerta: alerta.idUbicacionArea,
    stockPisoAlerta: alerta.stockActual,
    stockObjetivoAlerta: alerta.stockObjetivo,
  };
}

export function combinarReposConAlertas(
  cards: AlmacenSolicitud[],
  alertas: AlertaReposicion[]
): AlmacenSolicitud[] {
  const reposCola = cards.filter((c) => !esVenta(c) && !esTicketDesdeAlerta(c));
  const pendientes = alertas
    .filter((a) => !colaCubreAlerta(cards, a))
    .map(solicitudDesdeAlerta);
  return [...reposCola, ...pendientes];
}
