import { MaterialIcon } from "@/shared/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import type { VendedorSolicitudResumen } from "../../types/Vendedor";
import {
  getSoundTheme,
  setSoundTheme,
  playSoundByTheme,
  type SoundTheme,
} from "../almacen-tablero/almacenTableroSound";

export interface VendedorAlmacenActualizacion {
  idSolicitud: number;
  nombreProducto: string;
  estado: "ATENDIDO" | "CANCELADO";
  color?: string;
  talla?: string;
  cantidad?: number;
}

interface VendedorPisoPedidosDockProps {
  pedidos: VendedorSolicitudResumen[];
  onRefresh: () => void | Promise<void>;
  /** Solo true cuando el usuario pulsa «Actualizar» (no en el polling en segundo plano). */
  refrescando?: boolean;
  onNuevaRespuestaAlmacen?: (items: VendedorAlmacenActualizacion[]) => void;
  onCancelarPedido?: (idSolicitud: number) => void | Promise<void>;
  cancelandoSolicitudId?: number | null;
}

const etiquetaEstado = (estado: string): { label: string; dot: string } => {
  switch (estado) {
    case "PENDIENTE":
      return { label: "Pendiente", dot: "bg-amber-400 animate-pulse" };
    case "ATENDIDO":
      return { label: "Listo", dot: "bg-emerald-500" };
    case "CANCELADO":
      return { label: "Rechazado", dot: "bg-red-500" };
    default:
      return { label: estado, dot: "bg-gray-400" };
  }
};

const etiquetaTipo = (tipo: string): string => {
  if (tipo === "VENTA") return "Piso de ventas";
  if (tipo === "REPOSICION") return "Reposición auto";
  return tipo;
};

function formatearHora(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const VendedorPisoPedidosDock = ({
  pedidos,
  onRefresh,
  refrescando = false,
  onNuevaRespuestaAlmacen,
  onCancelarPedido,
  cancelandoSolicitudId = null,
}: VendedorPisoPedidosDockProps) => {
  const [abierto, setAbierto] = useState(false);
  const [hasNewResponse, setHasNewResponse] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [temaSonido, setTemaSonido] = useState<SoundTheme>(() => getSoundTheme("vendedor"));

  const prevPedidosRef = useRef(pedidos);
  const abiertoRef = useRef(abierto);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  abiertoRef.current = abierto;

  useEffect(() => {
    const prevPedidos = prevPedidosRef.current;
    const updates: VendedorAlmacenActualizacion[] = [];

    const isFirstLoad = prevPedidos.length === 0 && pedidos.length > 0;

    if (!isFirstLoad) {
      pedidos.forEach((pedido) => {
        const prev = prevPedidos.find((p) => p.idSolicitud === pedido.idSolicitud);
        if (
          prev &&
          prev.estado === "PENDIENTE" &&
          (pedido.estado === "ATENDIDO" || pedido.estado === "CANCELADO")
        ) {
          updates.push({
            idSolicitud: pedido.idSolicitud,
            nombreProducto: pedido.nombreProducto,
            estado: pedido.estado as "ATENDIDO" | "CANCELADO",
            color: pedido.color,
            talla: pedido.talla,
            cantidad: pedido.cantidad,
          });
        }
      });
    }

    prevPedidosRef.current = pedidos;

    if (updates.length === 0) {
      return undefined;
    }

    // Play synthesis chime according to the seller's active theme
    const activeTheme = getSoundTheme("vendedor");
    void playSoundByTheme(activeTheme);

    // Bubble enriched update objects to parent stack
    onNuevaRespuestaAlmacen?.(updates);

    if (!abiertoRef.current) {
      setHasNewResponse(true);
    }

    const timer = setTimeout(() => {
      setHasNewResponse(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [pedidos, onNuevaRespuestaAlmacen]);

  useEffect(() => {
    if (abierto) {
      setHasNewResponse(false);
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAbierto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (botonRef.current?.contains(target)) return;
      setAbierto(false);
    };

    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("touchstart", onPointer, { passive: true });
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [abierto]);

  const ordenados = useMemo(
    () =>
      pedidos.toSorted(
        (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      ),
    [pedidos]
  );

  const pendientes = useMemo(
    () => ordenados.filter((p) => p.estado === "PENDIENTE").length,
    [ordenados]
  );

  const cerrar = useCallback(() => {
    setAbierto(false);
    setShowConfig(false);
  }, []);

  const toggle = useCallback(() => {
    setAbierto((v) => !v);
    if (abierto) {
      setShowConfig(false);
    }
  }, [abierto]);

  const handleRefrescar = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const panelContent = (
    <div
      ref={panelRef}
      id="vendedor-pedidos-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="vendedor-pedidos-titulo"
      className="relative max-h-[48vh] w-full max-w-sm md:max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md animate-slideUpFade flex flex-col"
    >
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white/50 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <div className="min-w-0 flex-1">
          <span id="vendedor-pedidos-titulo" className="text-xs font-bold uppercase tracking-widest text-gray-900">
            Pedidos de hoy
          </span>
          {ordenados.length > 0 && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
              {pendientes > 0 ? `${pendientes} en espera` : "Nada pendiente"} · {ordenados.length} total
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleRefrescar}
            disabled={refrescando}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-black disabled:opacity-50"
            aria-label="Actualizar lista de pedidos"
          >
            {refrescando ? (
              <MaterialIcon icon="sync" className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <MaterialIcon icon="refresh" className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          
          {/* BOTÓN CONFIGURACIÓN SONIDO */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`rounded-xl p-2 transition-all active:scale-95 ${
              showConfig ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100 hover:text-black"
            }`}
            aria-label="Configuración de sonido de notificaciones"
          >
            <MaterialIcon icon="settings" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={cerrar}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            aria-label="Cerrar panel de pedidos"
          >
            <MaterialIcon icon="close" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PANEL DE AUDIO GLASSMORPHIC */}
      {showConfig && (
        <div className="relative z-10 shrink-0 border-b border-gray-100 bg-gray-50/50 p-3.5 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Tema de Sonido
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {([
              { id: "boutique", label: "Boutique", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "crystal", label: "Crystal", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "double", label: "Doble Beep", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "kiosk", label: "Clásico", icon: <MaterialIcon icon="volume_up" className="h-3.5 w-3.5" /> },
              { id: "mute", label: "Silencio", icon: <MaterialIcon icon="volume_off" className="h-3.5 w-3.5" /> }
            ] as { id: SoundTheme; label: string; icon: React.ReactNode }[]).map((theme) => {
              const active = temaSonido === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setSoundTheme("vendedor", theme.id);
                    setTemaSonido(theme.id);
                    void playSoundByTheme(theme.id);
                  }}
                  className={`flex items-center gap-1.5 justify-center px-2 py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-[0.98] ${
                    active
                      ? "bg-black border-black text-white shadow-sm"
                      : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {theme.icon}
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto px-2 py-2">
        {ordenados.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">
            Aún no hay solicitudes hoy. Cuando envíes una, aparecerá aquí.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordenados.map((p, idx) => {
              const { label, dot } = etiquetaEstado(p.estado);
              const hora = formatearHora(p.fechaCreacion);
              const esNovedad = p.estado === "ATENDIDO" || p.estado === "CANCELADO";
              
              return (
                <li
                  key={p.idSolicitud}
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                  className={`rounded-2xl border px-3 py-3 backdrop-blur-sm transition-all duration-300 animate-fadeIn ${
                    esNovedad 
                      ? p.estado === "ATENDIDO" 
                        ? "border-emerald-200 bg-emerald-50/20 shadow-[0_4px_15px_rgba(16,185,129,0.04)]" 
                        : "border-red-200 bg-red-50/20 shadow-[0_4px_15px_rgba(239,68,68,0.04)]"
                      : "border-gray-100 bg-[#fafafa]/80"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${dot}`}
                      title={label}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black">{p.nombreProducto}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            p.tipoSolicitud === "VENTA"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {etiquetaTipo(p.tipoSolicitud)}
                        </span>
                        <span>
                          {p.color} · Talla {p.talla} · Cant. {p.cantidad}
                        </span>
                        {hora ? (
                          <span className="text-[10px] font-medium text-gray-400 tabular-nums">{hora}</span>
                        ) : null}
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-bold uppercase tracking-wide ${
                          p.estado === "ATENDIDO"
                            ? "text-emerald-600"
                            : p.estado === "CANCELADO"
                              ? "text-red-500"
                              : "text-gray-500"
                        }`}
                      >
                        {label}
                      </p>
                      {p.estado === "PENDIENTE" && onCancelarPedido ? (
                        <button
                          type="button"
                          onClick={() => void onCancelarPedido(p.idSolicitud)}
                          disabled={cancelandoSolicitudId === p.idSolicitud}
                          className="mt-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                        >
                          {cancelandoSolicitudId === p.idSolicitud ? "Cancelando…" : "Cancelar pedido"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const fab = (
    <button
      ref={botonRef}
      type="button"
      onClick={toggle}
      aria-expanded={abierto}
      aria-controls="vendedor-pedidos-panel"
      aria-label={
        abierto
          ? "Cerrar panel de solicitudes a almacén"
          : "Abrir panel de solicitudes a almacén"
      }
      className={`relative flex h-14 min-w-14 items-center justify-center gap-1 rounded-2xl border px-3 text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.98] ${
        abierto ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-black"
      } ${hasNewResponse ? "ring-2 ring-offset-2 ring-emerald-400/90 ring-offset-[#f8f9fa]" : ""}`}
    >
      <div className="relative z-10 flex items-center gap-1">
        <MaterialIcon icon="notifications" className="h-6 w-6 shrink-0" />
        {abierto ? <MaterialIcon icon="expand_more" className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
        {ordenados.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black animate-bounce-in">
            {pendientes > 0 ? (pendientes > 9 ? "9+" : pendientes) : ordenados.length > 9 ? "9+" : ordenados.length}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[90] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex max-w-full flex-col items-end gap-2">
        {abierto &&
          (hasNewResponse ? (
            <BorderBeam size="line" colorVariant="colorful" duration={8} strength={0.83}>
              {panelContent}
            </BorderBeam>
          ) : (
            panelContent
          ))}

        <div className="relative">
          {hasNewResponse && !abierto ? (
            <BorderBeam size="line" colorVariant="colorful" duration={3} strength={0.9}>
              {fab}
            </BorderBeam>
          ) : (
            fab
          )}
        </div>
      </div>
    </div>
  );
};
