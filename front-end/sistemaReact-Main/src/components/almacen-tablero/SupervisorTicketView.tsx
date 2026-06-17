import { useEffect, useState } from "react";
import { MaterialIcon } from "@/shared/ui";
import type { AlmacenTicketConsolidado } from "../../types/AlmacenSolicitudes";
import { AlmacenSolicitudRuta } from "./AlmacenSolicitudRuta";
import {
  resumenDestinoDeSolicitud,
  resumenOrigenDeSolicitud,
} from "../../utils/solicitudUbicacion";


interface Props {
  ticket: AlmacenTicketConsolidado;
}

function useTiempoTranscurrido(fecha: string): { texto: string; minutos: number } {
  const [info, setInfo] = useState({ texto: "", minutos: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(fecha).getTime();
      const mins = Math.floor(diff / 60000);
      let txt = "";
      if (mins < 1) txt = "recien llegado";
      else if (mins < 60) txt = `${mins} ${mins === 1 ? "minuto" : "minutos"} en espera`;
      else {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        txt = `${h} ${h === 1 ? "hora" : "horas"}${m > 0 ? ` ${m} ${m === 1 ? "minuto" : "minutos"}` : ""} en espera`;
      }
      setInfo({ texto: txt, minutos: mins });
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [fecha]);

  return info;
}

function nivelAlertaPorTiempo(minutos: number): "baja" | "media" | "alta" {
  if (minutos >= 6) return "alta";
  if (minutos >= 3) return "media";
  return "baja";
}

export function SupervisorTicketView({ ticket }: Props) {
  const { texto: tiempo, minutos } = useTiempoTranscurrido(ticket.fechaCreacion);
  const alertaTiempo = nivelAlertaPorTiempo(minutos);

  const esVentaTicket = ticket.tipoSolicitud === "VENTA";
  const esLote = Boolean(ticket.codigoLote && (ticket.idsEnLote?.length ?? 0) > 1);
  const totalUnidades = ticket.lineas.reduce((acc, l) => acc + l.cantidad, 0);

  const alertaEstilos = {
    baja: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icono: "schedule",
      iconoClase: "text-emerald-500",
    },
    media: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      icono: "schedule",
      iconoClase: "text-amber-500",
    },
    alta: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icono: "warning",
      iconoClase: "text-red-500",
    },
  }[alertaTiempo];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-5 mb-6 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center bg-app-accent text-app-accent-fg">
              <MaterialIcon
                icon={esVentaTicket ? "shopping_bag" : "inventory_2"}
                className="w-6 h-6"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-app-text leading-tight uppercase tracking-tight truncate">
                {ticket.nombreVendedor || "Sin vendedor"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-app-surface border border-app-border text-app-text-muted">
                  {ticket.tipoSolicitud}
                </span>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  • {totalUnidades} uds · {ticket.lineas.length} líneas
                </span>
                {esLote && (
                  <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                    Lote ({ticket.idsEnLote?.length} tickets)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <AlmacenSolicitudRuta
          origen={resumenOrigenDeSolicitud(ticket)}
          destino={resumenDestinoDeSolicitud(ticket)}
          destinosAdicionales={ticket.destinosEnLote}
        />

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${alertaEstilos.bg}`}>
          <div className={`shrink-0 ${alertaEstilos.iconoClase}`}>
            <MaterialIcon icon={alertaEstilos.icono as "schedule" | "warning"} className="w-6 h-6" fill={alertaTiempo === "alta"} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest">
              {alertaTiempo === "alta"
                ? "Atencion urgente"
                : alertaTiempo === "media"
                  ? "Demora en la atencion"
                  : "Reciente"}
            </p>
            <p className="text-[13px] font-bold mt-0.5">
              {tiempo || "—"}
            </p>
          </div>
        </div>

        {ticket.codigoLote && (
          <div className="bg-gray-100/50 rounded-2xl p-4 flex items-center gap-3 border border-gray-100">
            <MaterialIcon icon="package" className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
              Lote: {ticket.codigoLote}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 space-y-3 pb-8">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
          Ítems solicitados
        </p>

        {ticket.lineas.map((linea, idx) => (
          <div
            key={`sv-${idx}-${linea.idVariante}`}
            className="w-full flex items-center justify-between p-5 rounded-[2rem] border-2 bg-app-surface border-app-border shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-app-bg-muted text-app-text-muted shrink-0">
                <span className="text-lg font-black">{linea.cantidad}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-app-text text-sm uppercase leading-tight line-clamp-2">
                  {linea.descripcion}
                </h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 truncate">
                  SKU: {linea.sku || "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
