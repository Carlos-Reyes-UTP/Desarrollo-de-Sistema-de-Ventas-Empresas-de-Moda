import type { ReactNode } from "react";
import { ShoppingBag, Box } from "lucide-react";
import type { AlmacenSolicitud } from "../../types/AlmacenSolicitudes";
import { AlmacenTicketCard } from "./AlmacenTicketCard";
import { agruparTickets } from "./almacenTableroUtils";

interface AlmacenColaLateralProps {
  ventas: AlmacenSolicitud[];
  repos: AlmacenSolicitud[];
  seleccionId: number | null;
  pulsando: Set<number>;
  activeTab: "ventas" | "repos";
  onTabChange: (tab: "ventas" | "repos") => void;
  onSelect: (id: number) => void;
  encabezadoExtra?: ReactNode;
}

export function AlmacenColaLateral({
  ventas,
  repos,
  seleccionId,
  pulsando,
  activeTab,
  onTabChange,
  onSelect,
  encabezadoExtra,
}: AlmacenColaLateralProps) {
  const ticketsVenta = agruparTickets(ventas);
  const ticketsRepo = agruparTickets(repos);
  const activeTickets = activeTab === "ventas" ? ticketsVenta : ticketsRepo;

  return (
    <div className="flex flex-col h-full bg-white">
      {encabezadoExtra}

      <div className="flex p-2 bg-gray-50/50 border-b border-gray-100 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("ventas")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all ${
            activeTab === "ventas"
              ? "bg-black text-white shadow-lg scale-[1.02]"
              : "text-gray-400 hover:bg-gray-100"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Ventas</span>
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
              activeTab === "ventas" ? "bg-white/20" : "bg-gray-200"
            }`}
          >
            {ticketsVenta.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("repos")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all ${
            activeTab === "repos"
              ? "bg-blue-600 text-white shadow-lg scale-[1.02]"
              : "text-gray-400 hover:bg-gray-100"
          }`}
        >
          <Box className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Repo</span>
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
              activeTab === "repos" ? "bg-white/20" : "bg-gray-200"
            }`}
          >
            {ticketsRepo.length}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
        {activeTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
              Sin pendientes
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeTickets.map((t) => {
              const seleccionado =
                seleccionId != null && t.idsSolicitud.includes(seleccionId);
              const cardPulsando = t.idsSolicitud.some((id) => pulsando.has(id));
              return (
                <AlmacenTicketCard
                  key={`${t.codigoLote ?? "ind"}-${t.idPrincipal}`}
                  vendedor={t.nombreVendedor}
                  itemsCount={t.itemsCount}
                  tipoSolicitud={t.tipoSolicitud}
                  fechaMasAntigua={t.fechaMasAntigua}
                  seleccionado={seleccionado}
                  pulsando={cardPulsando}
                  urgencia={t.urgencia}
                  onClick={() => onSelect(t.idPrincipal)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
