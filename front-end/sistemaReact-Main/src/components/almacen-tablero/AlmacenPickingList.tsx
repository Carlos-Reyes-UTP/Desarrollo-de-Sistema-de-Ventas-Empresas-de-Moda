import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/shared/ui";
import type { AlmacenTicketConsolidado } from "../../types/AlmacenSolicitudes";
import { STOCK_OBJETIVO_PISO } from "../../services/DashboardService";
import { AlmacenSolicitudRuta } from "./AlmacenSolicitudRuta";

import {
  resumenDestinoDeSolicitud,
  resumenOrigenDeSolicitud,
} from "../../utils/solicitudUbicacion";

const MAX_CANTIDAD_UI = 99;

function clampCantidad(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_CANTIDAD_UI, Math.floor(n)));
}

function cantidadEnvioInicial(ticket: AlmacenTicketConsolidado, esDesdeAlerta: boolean): number {
  if (esDesdeAlerta) {
    const sugerida = ticket.lineas[0]?.cantidad;
    return clampCantidad(sugerida ?? STOCK_OBJETIVO_PISO);
  }
  return STOCK_OBJETIVO_PISO;
}

interface AlmacenPickingListProps {
  ticket: AlmacenTicketConsolidado;
  procesando: boolean;
  /** Alerta de piso sin solicitud en cola: al confirmar se crea y despacha. */
  esDesdeAlerta?: boolean;
  onConfirmarTodo: (cantidadEnvio?: number) => void;
  onRechazar: () => void;
  onBack?: () => void;
}

function lineaKey(linea: { idVariante: number; sku: string }, idx: number): string {
  return `l-${idx}-v-${linea.idVariante}-${linea.sku}`;
}

type FilaItemTipo = "venta" | "alerta";

function filaItemClassName(isDone: boolean, tipo: FilaItemTipo): string {
  const base =
    "w-full flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  if (tipo === "alerta") {
    return `${base} ${
      isDone
        ? "bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100/80"
        : "bg-white border-emerald-200 shadow-sm hover:border-emerald-400 hover:bg-emerald-50/40 active:scale-[0.99]"
    }`;
  }

  return `${base} ${
    isDone
      ? "bg-gray-50 border-gray-100 opacity-60"
      : "bg-app-surface border-app-border shadow-sm hover:border-app-border-strong active:scale-[0.99]"
  }`;
}

function indicadorMarcadoClassName(isDone: boolean, tipo: FilaItemTipo): string {
  if (tipo === "alerta") {
    return `h-14 w-14 rounded-2xl border-[3px] flex items-center justify-center transition-all shrink-0 ml-3 pointer-events-none ${
      isDone
        ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-300/60 scale-105"
        : "bg-emerald-50 border-emerald-400 text-emerald-500"
    }`;
  }

  return `h-11 w-11 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 pointer-events-none ${
    isDone ? "bg-app-accent border-app-accent text-app-accent-fg" : "border-app-border-strong bg-app-surface"
  }`;
}

export function AlmacenPickingList({
  ticket,
  procesando,
  esDesdeAlerta = false,
  onConfirmarTodo,
  onRechazar,
}: AlmacenPickingListProps) {
  const [completados, setCompletados] = useState<Set<string>>(new Set());
  const [cantidadEnvio, setCantidadEnvio] = useState(() =>
    cantidadEnvioInicial(ticket, esDesdeAlerta)
  );

  const ticketKey = useMemo(() => {
    const ids = ticket.idsEnLote?.length
      ? ticket.idsEnLote.join(",")
      : String(ticket.idSolicitud);
    return `${ids}-${ticket.lineas.length}`;
  }, [ticket]);

  useEffect(() => {
    setCompletados(new Set());
    setCantidadEnvio(cantidadEnvioInicial(ticket, esDesdeAlerta));
  }, [ticketKey, esDesdeAlerta, ticket]);

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

  const totalUnidades = esDesdeAlerta
    ? cantidadEnvio
    : ticket.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const esLote = Boolean(ticket.codigoLote && (ticket.idsEnLote?.length ?? 0) > 1);
  const esVentaTicket = ticket.tipoSolicitud === "VENTA";

  const ajustarCantidad = (delta: number) => {
    setCantidadEnvio((prev) => clampCantidad(prev + delta));
  };

  const onInputCantidad = (raw: string) => {
    const parsed = parseInt(raw, 10);
    setCantidadEnvio(clampCantidad(Number.isNaN(parsed) ? 1 : parsed));
  };

  const renderCantidadBadge = (cantidad: number, isDone: boolean) => (
    <div
      className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${
        isDone ? "bg-app-accent text-app-accent-fg" : "bg-app-bg-muted text-app-text-muted"
      }`}
    >
      <span className="text-lg font-black">{cantidad}</span>
    </div>
  );

  const renderEditorCantidad = () => (
    <div
      className="flex items-center gap-1 shrink-0"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={procesando || cantidadEnvio <= 1}
        onClick={() => ajustarCantidad(-1)}
        className="h-12 w-10 rounded-xl bg-app-bg-muted text-app-text font-black text-lg disabled:opacity-30 active:scale-95"
        aria-label="Disminuir cantidad"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={MAX_CANTIDAD_UI}
        value={cantidadEnvio}
        disabled={procesando}
        onChange={(e) => onInputCantidad(e.target.value)}
        className="h-12 w-14 rounded-xl bg-app-input text-center text-lg font-black text-app-text border border-app-border tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Cantidad a enviar"
      />
      <button
        type="button"
        disabled={procesando || cantidadEnvio >= MAX_CANTIDAD_UI}
        onClick={() => ajustarCantidad(1)}
        className="h-12 w-10 rounded-xl bg-app-bg-muted text-app-text font-black text-lg disabled:opacity-30 active:scale-95"
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );

  const renderDetalleLinea = (linea: (typeof ticket.lineas)[0]) => (
    <div className="min-w-0">
      <h4 className="font-black text-app-text text-sm uppercase leading-tight line-clamp-2">
        {linea.descripcion}
      </h4>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 truncate">
        SKU: {linea.sku || "—"}
      </p>
    </div>
  );

  const renderIndicadorMarcado = (isDone: boolean, tipo: FilaItemTipo) => (
    <div className={indicadorMarcadoClassName(isDone, tipo)} aria-hidden>
      {isDone ? (
        <MaterialIcon icon="check" className={tipo === "alerta" ? "w-7 h-7" : "w-5 h-5"} fill />
      ) : tipo === "alerta" ? (
        <MaterialIcon icon="check_circle" className="w-7 h-7 opacity-40" />
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-all bg-app-accent text-app-accent-fg`}
              >
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
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-app-surface border border-app-border text-app-text-muted`}
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

          {!esDesdeAlerta && (
            <button
              type="button"
              onClick={onRechazar}
              disabled={procesando}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-red-500 transition-all shrink-0 disabled:opacity-40"
              title="Rechazar ticket"
            >
              <MaterialIcon icon="delete" className="w-5 h-5" />
            </button>
          )}
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
          {esDesdeAlerta
            ? "Reposicion sugerida para el área - marca cada ítem"
            : "Lista de recolección — marca cada ítem"}
        </p>

        {ticket.lineas.map((linea, idx) => {
          const key = lineaKeys[idx];
          const isDone = completados.has(key);

          const tipoFila: FilaItemTipo = esDesdeAlerta ? "alerta" : "venta";
          const ariaMarcar = isDone
            ? `Desmarcar ${linea.descripcion}`
            : `Marcar ${linea.descripcion}`;
          const contenidoFila = (
            <>
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {esDesdeAlerta ? renderEditorCantidad() : renderCantidadBadge(linea.cantidad, isDone)}
                {renderDetalleLinea(linea)}
              </div>
              {renderIndicadorMarcado(isDone, tipoFila)}
            </>
          );

          if (esDesdeAlerta) {
            return (
              <div
                key={key}
                role="button"
                tabIndex={procesando ? -1 : 0}
                aria-label={ariaMarcar}
                aria-pressed={isDone}
                onClick={() => !procesando && toggleItem(key)}
                onKeyDown={(e) => {
                  if (procesando) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleItem(key);
                  }
                }}
                className={filaItemClassName(isDone, tipoFila)}
              >
                {contenidoFila}
              </div>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleItem(key)}
              disabled={procesando}
              className={filaItemClassName(isDone, tipoFila)}
              aria-label={ariaMarcar}
            >
              {contenidoFila}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-app-surface/90 backdrop-blur-xl border-t border-app-border lg:relative lg:bg-transparent lg:border-none lg:p-0 lg:mt-8 z-50">
        <button
          type="button"
          onClick={() => onConfirmarTodo(esDesdeAlerta ? cantidadEnvio : undefined)}
          disabled={procesando || !todoMarcado}
          className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3 ${
            todoMarcado
              ? "bg-app-accent text-app-accent-fg active:scale-95"
              : "bg-app-bg-muted text-app-text-muted cursor-not-allowed"
          }`}
        >
          {procesando ? (
            <MaterialIcon icon="sync" className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MaterialIcon icon="check" className="w-5 h-5" />
              {esDesdeAlerta ? "Despachar Mercaderia" : "Finalizar despacho"}
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
