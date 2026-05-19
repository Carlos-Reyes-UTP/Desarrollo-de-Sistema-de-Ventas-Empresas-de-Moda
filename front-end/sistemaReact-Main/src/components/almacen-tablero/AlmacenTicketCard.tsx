import { useEffect, useState } from "react";
import { Clock, Layers, User } from "lucide-react";

interface Props {
  vendedor: string;
  itemsCount: number;
  tipoSolicitud: string;
  fechaMasAntigua: string;
  seleccionado: boolean;
  pulsando: boolean;
  urgencia: "baja" | "media" | "alta";
  onClick: () => void;
}

function useTiempoTranscurrido(fecha: string): string {
  const [t, setT] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(fecha).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setT("ahora");
      else if (mins < 60) setT(`${mins}m`);
      else setT(`${Math.floor(mins / 60)}h`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [fecha]);

  return t;
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
  pulsando,
  urgencia,
  onClick,
}: Props) {
  const esVenta = tipoSolicitud === "VENTA";
  const tiempo = useTiempoTranscurrido(fechaMasAntigua);

  const bgUrgencia = {
    baja: "bg-emerald-50 border-emerald-100",
    media: "bg-amber-50 border-amber-100",
    alta: "bg-red-50 border-red-100",
  }[urgencia];

  const textUrgencia = {
    baja: "text-emerald-600",
    media: "text-amber-600",
    alta: "text-red-600",
  }[urgencia];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full flex flex-col gap-3 p-5 rounded-[2rem] border-2 transition-all duration-300 text-left ${
        seleccionado
          ? "bg-black border-black shadow-xl scale-[1.02]"
          : `${bgUrgencia} hover:border-gray-300 hover:bg-white`
      } ${pulsando ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
            seleccionado
              ? "bg-white/10 text-white/60"
              : esVenta
                ? "bg-black/5 text-black/40"
                : "bg-blue-50 text-blue-400"
          }`}
        >
          {esVenta ? "VENTA" : "REPOSICIÓN"}
        </span>
        <div className={`flex items-center gap-1.5 ${seleccionado ? "text-white/60" : textUrgencia}`}>
          <Clock className="w-3 h-3" strokeWidth={3} />
          <span className="text-[10px] font-black tabular-nums">{tiempo || "—"}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            seleccionado ? "bg-white/10 text-white" : "bg-white text-black shadow-sm"
          }`}
        >
          <User className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p
            className={`text-xs font-black uppercase tracking-tight truncate ${
              seleccionado ? "text-white" : "text-black"
            }`}
          >
            {vendedor || "Sin vendedor"}
          </p>
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${
              seleccionado ? "text-white/40" : "text-gray-400"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="text-[10px] font-bold">
              {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
            </span>
          </div>
        </div>
      </div>

      {seleccionado && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-10 bg-white rounded-l-full shadow-lg" />
      )}
    </button>
  );
}
