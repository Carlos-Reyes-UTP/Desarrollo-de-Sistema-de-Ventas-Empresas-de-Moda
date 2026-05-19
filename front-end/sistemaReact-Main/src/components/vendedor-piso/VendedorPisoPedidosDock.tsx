import { Bell, ChevronDown, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BorderBeam } from "border-beam";
import type { VendedorSolicitudResumen } from "../../types/Vendedor";

export interface VendedorAlmacenActualizacion {
  nombreProducto: string;
  estado: "ATENDIDO" | "CANCELADO";
}

interface VendedorPisoPedidosDockProps {
  pedidos: VendedorSolicitudResumen[];
  onRefresh: () => void | Promise<void>;
  /** Solo true cuando el usuario pulsa «Actualizar» (no en el polling en segundo plano). */
  refrescando?: boolean;
  onNuevaRespuestaAlmacen?: (items: VendedorAlmacenActualizacion[]) => void;
}

const etiquetaEstado = (estado: string): { label: string; dot: string } => {
  switch (estado) {
    case "PENDIENTE":
      return { label: "Pendiente", dot: "bg-amber-400" };
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

interface WindowWithAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as WindowWithAudio).webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);

    setTimeout(() => {
      audioCtx.close().catch(() => undefined);
    }, 500);
  } catch (e) {
    console.error("Audio context error:", e);
  }
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
}: VendedorPisoPedidosDockProps) => {
  const [abierto, setAbierto] = useState(false);
  const [hasNewResponse, setHasNewResponse] = useState(false);
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
            nombreProducto: pedido.nombreProducto,
            estado: pedido.estado as "ATENDIDO" | "CANCELADO",
          });
        }
      });
    }

    prevPedidosRef.current = pedidos;

    if (updates.length === 0) {
      return undefined;
    }

    playNotificationSound();
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

  const cerrar = useCallback(() => setAbierto(false), []);

  const toggle = useCallback(() => {
    setAbierto((v) => !v);
  }, []);

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
      className="relative max-h-[45vh] w-full max-w-sm md:max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md animate-slideUpFade"
    >
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/50 px-3 py-2.5 backdrop-blur-sm sm:px-4">
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            aria-label="Cerrar panel de pedidos"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative z-10 max-h-[38vh] overflow-y-auto px-2 py-2">
        {ordenados.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">
            Aún no hay solicitudes hoy. Cuando envíes una, aparecerá aquí.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordenados.map((p, idx) => {
              const { label, dot } = etiquetaEstado(p.estado);
              const hora = formatearHora(p.fechaCreacion);
              return (
                <li
                  key={p.idSolicitud}
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                  className="rounded-2xl border border-gray-100 bg-[#fafafa]/80 px-3 py-3 backdrop-blur-sm animate-fadeIn"
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
        <Bell className="h-6 w-6 shrink-0" strokeWidth={2} />
        {abierto ? <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
        {ordenados.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
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
