import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/shared/ui";
import type { AlmacenTicketConsolidado } from "../../types/AlmacenSolicitudes";
import { AlmacenSolicitudRuta } from "./AlmacenSolicitudRuta";
import {
  resumenDestinoDeSolicitud,
  resumenOrigenDeSolicitud,
} from "../../utils/solicitudUbicacion";

interface AlmacenPickingListProps {
  ticket: AlmacenTicketConsolidado;
  procesando: boolean;
  onConfirmarTodo: () => void;
  onRechazar: () => void;
  onBack?: () => void;
}

function lineaKey(linea: { idVariante: number; sku: string }, idx: number): string {
  return linea.idVariante > 0 ? `v-${linea.idVariante}` : `i-${idx}-${linea.sku}`;
}

export function AlmacenPickingList({
  ticket,
  procesando,
  onConfirmarTodo,
  onRechazar,
}: AlmacenPickingListProps) {
  const [completados, setCompletados] = useState<Set<string>>(new Set());

  const ticketKey = useMemo(() => {
    const ids = ticket.idsEnLote?.length
      ? ticket.idsEnLote.join(",")
      : String(ticket.idSolicitud);
    return `${ids}-${ticket.lineas.length}`;
  }, [ticket]);

  useEffect(() => {
    setCompletados(new Set());
  }, [ticketKey]);

  const lineaKeys = useMemo(
    () => ticket.lineas.map((l, idx) => lineaKey(l, idx)),
    [ticket.lineas]
  );

  const toggleItem = (key: string) => {
    setCompletados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const todoMarcado = useMemo(
    () => lineaKeys.length > 0 && lineaKeys.every((k) => completados.has(k)),
    [lineaKeys, completados]
  );

  const totalUnidades = ticket.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const esLote = Boolean(ticket.codigoLote && (ticket.idsEnLote?.length ?? 0) > 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg shrink-0">
              <MaterialIcon icon="person" className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-black leading-tight uppercase tracking-tight truncate">
                {ticket.nombreVendedor || "Sin vendedor"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                    ticket.tipoSolicitud === "VENTA"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
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

          <button
            type="button"
            onClick={onRechazar}
            disabled={procesando}
            className="p-3 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 disabled:opacity-40"
            title="Rechazar ticket"
          >
            <MaterialIcon icon="delete" className="w-5 h-5" />
          </button>
        </div>

        <AlmacenSolicitudRuta
          origen={resumenOrigenDeSolicitud(ticket)}
          destino={resumenDestinoDeSolicitud(ticket)}
          destinosAdicionales={ticket.destinosEnLote}
        />

        {ticket.codigoLote && (
          <div className="bg-gray-100/50 rounded-2xl p-4 flex items-center gap-3 border border-gray-100">
            <MaterialIcon icon="package" className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
              Lote: {ticket.codigoLote}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 space-y-3 pb-36 lg:pb-8">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
          Lista de recolección — marca cada ítem
        </p>

        {ticket.lineas.map((linea, idx) => {
          const key = lineaKeys[idx];
          const isDone = completados.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleItem(key)}
              className={`w-full flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300 text-left ${
                isDone
                  ? "bg-gray-50 border-gray-100 opacity-60"
                  : "bg-white border-white shadow-sm hover:border-black/5"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isDone ? "bg-black text-white" : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <span className="text-lg font-black">{linea.cantidad}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-black text-sm uppercase leading-tight line-clamp-2">
                    {linea.descripcion}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 truncate">
                    SKU: {linea.sku || "—"}
                  </p>
                </div>
              </div>

              <div
                className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 ${
                  isDone ? "bg-black border-black text-white" : "border-gray-100 bg-white"
                }`}
              >
                {isDone && <MaterialIcon icon="check" className="w-5 h-5" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-gray-100 lg:relative lg:bg-transparent lg:border-none lg:p-0 lg:mt-8 z-50">
        <button
          type="button"
          onClick={onConfirmarTodo}
          disabled={procesando || !todoMarcado}
          className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3 ${
            todoMarcado
              ? "bg-black text-white active:scale-95"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {procesando ? (
            <MaterialIcon icon="sync" className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MaterialIcon icon="check" className="w-5 h-5" />
              Finalizar despacho
            </>
          )}
        </button>
        {!todoMarcado && !procesando && (
          <p className="text-center text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-widest">
            Marca todos los ítems para habilitar el despacho
          </p>
        )}
      </div>
    </div>
  );
}
