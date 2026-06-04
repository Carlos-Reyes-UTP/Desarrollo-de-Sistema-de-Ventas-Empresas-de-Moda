import type { ReactNode } from "react";

import { MaterialIcon } from "@/shared/ui";

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

  primerVentaId: number | null;

  onIrAVentas?: () => void;

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

  primerVentaId,

  onIrAVentas,

  encabezadoExtra,

}: AlmacenColaLateralProps) {

  const ticketsVenta = agruparTickets(ventas);

  const ticketsRepo = agruparTickets(repos);

  const activeTickets = activeTab === "ventas" ? ticketsVenta : ticketsRepo;

  const hayVentasPendientes = ticketsVenta.length > 0;

  const ventasPrioritariasEnRepo =

    activeTab === "repos" && hayVentasPendientes;

  const hintSoloRepos =

    activeTab === "ventas" && ticketsVenta.length === 0 && ticketsRepo.length > 0;



  const handleIrAVentas = () => {

    onTabChange("ventas");

    if (primerVentaId != null) {

      onSelect(primerVentaId);

    }

    onIrAVentas?.();

  };



  return (

    <div className="flex flex-col h-full bg-app-surface">

      {encabezadoExtra}



      <div className="flex p-2 bg-app-bg-muted border-b border-app-border gap-2 shrink-0">

        <button

          type="button"

          onClick={() => onTabChange("ventas")}

          className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all ${

            activeTab === "ventas"

              ? "bg-app-accent text-app-accent-fg shadow-lg scale-[1.02]"

              : ventasPrioritariasEnRepo

                ? "text-amber-700 bg-amber-50 border-2 border-amber-300 hover:bg-amber-100"

                : "text-app-text-muted hover:bg-app-hover-overlay"

          }`}

        >

          {ventasPrioritariasEnRepo && (

            <span

              className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"

              aria-hidden

            />

          )}

          <MaterialIcon icon="shopping_bag" className="w-4 h-4" />

          <span className="text-[10px] font-black uppercase tracking-widest">Ventas</span>

          <span

            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${

              activeTab === "ventas"

                ? "bg-white/20"

                : ventasPrioritariasEnRepo

                  ? "bg-amber-200 text-amber-900"

                  : "bg-gray-200"

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

              ? "bg-app-accent text-app-accent-fg shadow-lg scale-[1.02]"

              : "text-app-text-muted hover:bg-app-hover-overlay"

          }`}

        >

          <MaterialIcon icon="package" className="w-4 h-4" />

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

        {ventasPrioritariasEnRepo && (

          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-2">

            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-relaxed">

              {ticketsVenta.length === 1

                ? "1 venta pendiente — atender primero"

                : `${ticketsVenta.length} ventas pendientes — atender primero`}

            </p>

            <button

              type="button"

              onClick={handleIrAVentas}

              className="w-full py-2.5 rounded-xl bg-app-accent text-app-accent-fg text-[10px] font-black uppercase tracking-widest active:scale-[0.98] transition-transform"

            >

              Ir a ventas

            </button>

          </div>

        )}



        {hintSoloRepos && (

          <p className="mb-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center px-2">

            Sin ventas — puedes revisar reposición

          </p>

        )}



        {activeTickets.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-20 px-6 bg-app-surface/50 rounded-[2.5rem]">

            <p className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] text-center leading-relaxed">

              {activeTab === "repos"

                ? "Sin reposiciones pendientes en esta línea"

                : "Sin pendientes"}

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

                  origen={t.origen}

                  destino={t.destino}

                  destinosAdicionales={t.destinosAdicionales}

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

