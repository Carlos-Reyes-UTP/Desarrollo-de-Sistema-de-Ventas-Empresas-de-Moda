import { useEffect, useState } from "react";
import { MaterialIcon } from "@/shared/ui";
import type { UbicacionSolicitudResumen } from "./AlmacenSolicitudRuta";

interface Props {
  vendedor: string;
  itemsCount: number;
  tipoSolicitud: string;
  origen: UbicacionSolicitudResumen;
  destino: UbicacionSolicitudResumen;
  destinosAdicionales?: UbicacionSolicitudResumen[];
  fechaMasAntigua: string;
  seleccionado: boolean;
  pulsando: boolean;
  urgencia: "baja" | "media" | "alta";
  onClick: () => void;
}

function useTiempoMins(fecha: string): { texto: string; minutos: number } {
  const [info, setInfo] = useState({ texto: "", minutos: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(fecha).getTime();
      const mins = Math.floor(diff / 60000);
      let txt = "";
      if (mins < 1) txt = "ahora";
      else if (mins < 60) txt = `${mins}m`;
      else txt = `${Math.floor(mins / 60)}h`;
      
      setInfo({ texto: txt, minutos: mins });
    };
    update();
    const id = setInterval(update, 15000); // actualiza cada 15 segundos para alta precisión
    return () => clearInterval(id);
  }, [fecha]);

  return info;
}

/**
 * Representa un "Ticket de Pedido" agrupado en la cola lateral.
 */
export function AlmacenTicketCard({
  vendedor,
  itemsCount,
  tipoSolicitud,
  fechaMasAntigua,
  seleccionado,
  onClick,
}: Props) {
  const esVentaCard = tipoSolicitud === "VENTA";
  const { texto: tiempo, minutos } = useTiempoMins(fechaMasAntigua);

  const seleccionVenta = seleccionado && esVentaCard;
  const seleccionRepo = seleccionado && !esVentaCard;

  // Determinar nivel de alerta dinámico por el tiempo en espera real
  let alertaTiempo: "baja" | "media" | "alta" = "baja";
  if (minutos >= 6) {
    alertaTiempo = "alta";
  } else if (minutos >= 3) {
    alertaTiempo = "media";
  }

  // Estilos de fondos y bordes basados en la alerta de tiempo actual
  const bgUrgencia = {
    baja: "bg-emerald-50/70 border-emerald-100/80 shadow-[0_4px_12px_rgba(16,185,129,0.01)]",
    media: "bg-amber-50/75 border-amber-100/90 shadow-[0_4px_15px_rgba(245,158,11,0.03)]",
    alta: "bg-red-50/75 border-red-100/90 shadow-[0_4px_18px_rgba(239,68,68,0.05)]",
  }[alertaTiempo];

  return (
    <>
      <style>{`
        @keyframes pulseGlowAlta {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.05);
            border-color: rgba(239, 68, 68, 0.35);
            transform: scale(1) translateX(0);
          }
          10%, 26% {
            transform: scale(1.004) translateX(-1px);
          }
          18%, 34% {
            transform: scale(1.004) translateX(1px);
          }
          50% {
            box-shadow: 0 10px 25px rgba(239, 68, 68, 0.22);
            border-color: rgba(239, 68, 68, 0.7);
            transform: scale(1.01) translateX(0);
          }
        }
        @keyframes pulseGlowMedia {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.05);
            border-color: rgba(245, 158, 11, 0.35);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.22);
            border-color: rgba(245, 158, 11, 0.7);
            transform: scale(1.008);
          }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-pulseGlowAlta {
          animation: pulseGlowAlta 2.5s infinite ease-in-out;
        }
        .animate-pulseGlowMedia {
          animation: pulseGlowMedia 3s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spinSlow 8s linear infinite;
        }
      `}</style>

      <button
        type="button"
        onClick={onClick}
        className={`group relative w-full flex flex-col gap-2.5 p-4 rounded-[2rem] border-2 transition-all duration-300 text-left overflow-hidden ${
          seleccionVenta
            ? "bg-app-accent border-app-accent shadow-xl scale-[1.01] pl-7"
            : seleccionRepo
              ? "bg-app-accent border-app-accent shadow-xl scale-[1.01] pl-7"
              : `${bgUrgencia} hover:border-app-border-strong hover:bg-app-surface active:scale-[0.99]`
        } ${
          !seleccionado
            ? alertaTiempo === "alta"
              ? "animate-pulseGlowAlta"
              : alertaTiempo === "media"
                ? "animate-pulseGlowMedia"
                : ""
            : ""
        }`}
      >
        {/* Left Vertical Selector Pill inside the card */}
        {seleccionado && (
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-9 rounded-full animate-fadeIn ${
            alertaTiempo === "alta" ? "bg-red-400" : alertaTiempo === "media" ? "bg-amber-400" : "bg-app-surface"
          }`} />
        )}

        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
                seleccionado
                  ? "bg-app-surface/20 text-app-accent-fg/70"
                  : esVentaCard
                    ? "bg-app-text-muted/10 text-app-text-muted"
                    : "bg-app-text-muted/10 text-app-text-muted"
              }`}
            >
              {esVentaCard ? "VENTA" : "REPOSICIÓN"}
            </span>
            
            {/* Pequeño tag textual de alerta de retardo */}
            {alertaTiempo === "alta" && (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                seleccionado ? "bg-red-500/30 text-red-300" : "bg-red-100 text-red-700 animate-pulse"
              }`}>
                CRÍTICO
              </span>
            )}
            {alertaTiempo === "media" && (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                seleccionado ? "bg-amber-500/30 text-amber-300" : "bg-amber-100 text-amber-700"
              }`}>
                DEMORADO
              </span>
            )}
          </div>

          {/* Badge del Timer dinámico */}
          {alertaTiempo === "alta" ? (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black tabular-nums transition-all ${
              seleccionado 
                ? "bg-red-500/20 border-red-400/30 text-red-300" 
                : "bg-red-50 border-red-100 text-red-600 animate-pulse"
            }`}>
              <MaterialIcon icon="warning" className="w-3.5 h-3.5 text-red-500" fill />
              <span>{tiempo || "—"}</span>
            </div>
          ) : alertaTiempo === "media" ? (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black tabular-nums transition-all ${
              seleccionado 
                ? "bg-amber-500/20 border-amber-400/30 text-amber-300" 
                : "bg-amber-50 border-amber-100 text-amber-600"
            }`}>
              <MaterialIcon icon="schedule" className="w-3.5 h-3.5 text-amber-500" />
              <span>{tiempo || "—"}</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black tabular-nums transition-all ${
              seleccionado 
                ? "bg-white/10 border-white/10 text-white/60" 
                : "bg-emerald-50 border-emerald-100 text-emerald-600"
            }`}>
              <MaterialIcon icon="schedule" className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
              <span>{tiempo || "—"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              seleccionado ? "bg-app-surface/10 text-app-accent-fg" : "bg-app-surface text-app-text shadow-sm"
            }`}
          >
            <MaterialIcon icon="person" className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-xs font-black uppercase tracking-tight truncate ${
                seleccionado ? "text-app-accent-fg" : "text-app-text"
              }`}
            >
              {vendedor || "Sin vendedor"}
            </p>
            <div
              className={`flex items-center gap-1.5 mt-0.5 ${
                seleccionado ? "text-app-accent-fg/50" : "text-app-text-muted"
              }`}
            >
              <MaterialIcon icon="layers" className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
              </span>
            </div>
          </div>
        </div>
      </button>
    </>
  );
}
